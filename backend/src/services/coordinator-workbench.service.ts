import type { PrismaClient, Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prismaClient } from "../database";
import { NotFoundError, UnprocessableEntityError, ValidationError } from "../errors";
import { computeTicketEffectiveStatus } from "../utils/ticket-status";
import { TicketRepository, type TicketCreationPayload } from "../repositories/ticket.repository";
import { TicketNumberService } from "./ticket-number.service";

const CLOSED = "Closed";
const CANCELLED = "Cancelled";
const TERMINAL_STATUSES = [CLOSED, CANCELLED];
const PAYMENT_MODES = ["NEFT", "UPI"];
const VALID_WORKFLOW_STAGES = ["CREATED", "SERVICE_TL_REVIEW", "CONSULTATION_RESOLVED", "WORKSHOP_REQUIRED", "RFD", "REOPENED", "CLOSED", "CANCELLED"];
/**
 * Stages a ticket is actively moving through. A ticket can be Closed or Cancelled while its
 * workflowStage is still sitting at one of these (cancellation/closure don't reset workflowStage),
 * so these buckets must exclude terminal-status tickets - otherwise a cancelled ticket still shows
 * up under "Created" (or wherever it was) forever. CONSULTATION_RESOLVED is deliberately excluded
 * from this list: it is itself a terminal, always-Closed stage (its own "closed via consultation"
 * bucket), not an in-flight one.
 */
const IN_FLIGHT_STAGES = ["CREATED", "SERVICE_TL_REVIEW", "WORKSHOP_REQUIRED", "RFD", "REOPENED"];
const select = { id:true,ticketNumber:true,priority:true,createdAt:true,updatedAt:true,eta:true,coordinatorNotes:true,workflowStage:true,estimatedCharges:true,finalCharges:true,paymentMode:true,paymentUtrNumber:true,paymentAmount:true,paymentRecordedAt:true,reopenCount:true,reopenedAt:true,status:{select:{name:true}},customer:{select:{name:true,registeredMobile:true}},deployment:{select:{vehicleNumber:true,mvTrackNumber:true,vehicleModel:{select:{displayName:true}},hub:{select:{name:true}}}},issueCategory:{select:{id:true,name:true}},assignedTo:{select:{id:true,name:true}},serviceTl:{select:{id:true,name:true}},jobCard:{select:{workflowStage:true,lastEditedAt:true,totalCharges:true,finalSparePartsAmount:true,technician:{select:{name:true}}}},parentTicket:{select:{id:true,ticketNumber:true}},followUpTickets:{select:{id:true,ticketNumber:true,createdAt:true,status:{select:{name:true}}},orderBy:{createdAt:'asc'}} } satisfies Prisma.TicketSelect;
export class CoordinatorWorkbenchService {
  private readonly ticketRepository: TicketRepository;
  private readonly ticketNumberService: TicketNumberService;

  constructor(
    private readonly prisma: PrismaClient=prismaClient,
    ticketRepository?: TicketRepository,
    ticketNumberService?: TicketNumberService
  ) {
    this.ticketRepository = ticketRepository ?? new TicketRepository(this.prisma);
    this.ticketNumberService = ticketNumberService ?? new TicketNumberService(this.prisma);
  }
  async list(query:any) {
    const now=new Date();
    const priorityDate=new Date(now.getTime()-72*3600000);
    const quick=String(query.quick??'').toLowerCase();
    const requestedStage=typeof query.workflowStage==='string'&&VALID_WORKFLOW_STAGES.includes(query.workflowStage)?query.workflowStage:undefined;
    /** Default view (no explicit stage) only ever shows in-flight stages, so it always needs the terminal-status exclusion too. */
    const excludeTerminal = requestedStage ? IN_FLIGHT_STAGES.includes(requestedStage) : true;
    const where:Prisma.TicketWhereInput={
      deletedAt:null,
      ...(requestedStage==='CLOSED'
        ?{status:{name:CLOSED}}
        :requestedStage==='CANCELLED'
          ?{status:{name:CANCELLED}}
          :{
              workflowStage: requestedStage ? requestedStage : {in:['CREATED','RFD','REOPENED']},
              ...(excludeTerminal?{status:{name:{notIn:TERMINAL_STATUSES}}}:{}),
            }),
      ...(query.search?{OR:[{ticketNumber:{contains:query.search,mode:'insensitive'}},{customer:{name:{contains:query.search,mode:'insensitive'}}},{customer:{registeredMobile:{contains:query.search}}},{deployment:{vehicleNumber:{contains:query.search,mode:'insensitive'}}}]}:{}),
      ...(query.status&&requestedStage!=='CLOSED'&&requestedStage!=='CANCELLED'?{status:{name:query.status}}:{}),
      ...(query.hub?{deployment:{hub:{name:query.hub}}}:{}),
      ...(query.category?{issueCategory:{name:query.category}}:{}),
      ...(query.priority?{priority:query.priority}:{}),
      ...(quick==='new'?{status:{name:'Open'}}:{}),
      ...(quick==='in-progress'?{status:{name:'In Progress'}}:{}),
      ...(quick==='waiting'?{status:{name:'Waiting for Parts'}}:{}),
      ...(quick==='closed-today'?{status:{name:CLOSED},createdAt:{gte:new Date(now.setHours(0,0,0,0))}}:{}),
      ...(quick==='high'?{createdAt:{lte:priorityDate},NOT:{status:{name:CLOSED}}}:{}),
      ...(query.from||query.to?{createdAt:{...(query.from?{gte:new Date(query.from)}:{}),...(query.to?{lte:new Date(query.to)}:{})}}:{}),
    };
    const page=Math.max(1,Number(query.page)||1),pageSize=Math.min(100,Math.max(1,Number(query.pageSize)||25));
    const [items,total]=await this.prisma.$transaction([this.prisma.ticket.findMany({where,select,orderBy:{updatedAt:'desc'},skip:(page-1)*pageSize,take:pageSize}),this.prisma.ticket.count({where})]);
    return {items:items.map(x=>this.map(x)),total,page,pageSize};
  }
  async summary(){
    const items=await this.prisma.ticket.findMany({where:{deletedAt:null},select:{status:{select:{name:true}},createdAt:true,workflowStage:true}});
    const high=items.filter(x=>x.status.name!==CLOSED&&x.createdAt.getTime()<Date.now()-72*3600000).length;
    const count=(name:string)=>items.filter(x=>x.status.name===name).length;
    /** In-flight stages exclude tickets that have since been Closed or Cancelled without leaving that workflowStage - see IN_FLIGHT_STAGES. */
    const stageCount=(stage:string)=>items.filter(x=>x.workflowStage===stage&&(!IN_FLIGHT_STAGES.includes(stage)||!TERMINAL_STATUSES.includes(x.status.name))).length;
    return {
      new:count('Open'),
      inProgress:count('In Progress'),
      waiting:count('Waiting for Parts'),
      closedToday:count(CLOSED),
      closedTotal:count(CLOSED),
      cancelledTotal:count(CANCELLED),
      highPriority:high,
      workflowStageCounts:{
        CREATED:stageCount('CREATED'),
        SERVICE_TL_REVIEW:stageCount('SERVICE_TL_REVIEW'),
        CONSULTATION_RESOLVED:stageCount('CONSULTATION_RESOLVED'),
        WORKSHOP_REQUIRED:stageCount('WORKSHOP_REQUIRED'),
        RFD:stageCount('RFD'),
        REOPENED:stageCount('REOPENED'),
      },
    };
  }
  async detail(id:string){ const ticket=await this.prisma.ticket.findUnique({where:{id},select:{...select,activities:{orderBy:{performedAt:'desc'},select:{id:true,activityType:true,description:true,performedAt:true,performedBy:{select:{name:true}},metadata:true}},comments:{orderBy:{createdAt:'desc'},select:{id:true,comment:true,createdAt:true,createdBy:{select:{name:true}}}}}}); if(!ticket)throw new NotFoundError('Ticket was not found.'); return {...this.map(ticket),timeline:[...ticket.activities,...ticket.comments.map(c=>({id:c.id,activityType:'REMARK_ADDED',description:c.comment,performedAt:c.createdAt,performedBy:c.createdBy,metadata:null}))].sort((a,b)=>b.performedAt.getTime()-a.performedAt.getTime())}; }
  async status(id:string,input:any,userId?:string){ if(!input.status)throw new ValidationError('Status is required.'); if(String(input.status).trim().toLowerCase()===CANCELLED.toLowerCase())throw new ValidationError('Cancelled can only be reached through Request Cancellation and Service Engineer approval.'); return this.change(id,input.status,input.remarks,userId,'STATUS_UPDATED'); }
  async workshop(id:string,input:any,userId?:string){ if(!input.workshop?.trim())throw new ValidationError('Workshop is required.'); await this.ensureOpen(id); await this.prisma.ticketActivity.create({data:{ticketId:id,activityType:'WORKSHOP_ASSIGNED',description:`Workshop assigned: ${input.workshop}.`,performedById:userId,performedAt:new Date(),metadata:{workshop:input.workshop}}}); return this.detail(id); }
  async eta(id:string,input:any,userId?:string){ if(!input.eta||Number.isNaN(new Date(input.eta).getTime()))throw new ValidationError('A valid ETA is required.'); await this.ensureOpen(id); await this.prisma.$transaction([this.prisma.ticket.update({where:{id},data:{eta:new Date(input.eta)}}),this.prisma.ticketActivity.create({data:{ticketId:id,activityType:'ETA_UPDATED',description:'ETA updated.',performedById:userId,performedAt:new Date(),metadata:{eta:input.eta,remarks:input.remarks??null}}})]); return this.detail(id); }
  async remarks(id:string,input:any,userId?:string){ if(!input.remarks?.trim())throw new ValidationError('Remarks are required.'); await this.ensureOpen(id); await this.prisma.ticketComment.create({data:{ticketId:id,comment:input.remarks.trim(),internal:true,createdById:userId}}); return this.detail(id); }
  async close(id:string,input:any,userId?:string){
    if(!input.remarks?.trim())throw new ValidationError('Closure remarks are required.');
    const paymentMode=String(input.paymentMode??'').trim().toUpperCase();
    if(!PAYMENT_MODES.includes(paymentMode))throw new ValidationError('Payment mode must be NEFT or UPI.');
    if(!String(input.utrNumber??'').trim())throw new ValidationError('UTR number is required.');
    const amount=Number(input.amount);
    if(!Number.isFinite(amount)||amount<0)throw new ValidationError('A valid payment amount is required.');
    await this.change(id,CLOSED,input.remarks,userId,'TICKET_CLOSED');
    await this.prisma.ticket.update({where:{id},data:{paymentMode,paymentUtrNumber:String(input.utrNumber).trim(),paymentAmount:amount,paymentRecordedAt:new Date()}});
    return this.detail(id);
  }
  async scheduleDelivery(id:string,input:any,userId?:string){ if(!input.scheduledAt||Number.isNaN(new Date(input.scheduledAt).getTime()))throw new ValidationError('A valid delivery date/time is required.'); const t=await this.prisma.ticket.findUnique({where:{id},select:{workflowStage:true}}); if(!t)throw new NotFoundError('Ticket was not found.'); if(t.workflowStage!=='RFD')throw new UnprocessableEntityError('Delivery can only be scheduled once the job card is Ready for Delivery.'); await this.prisma.$transaction([this.prisma.ticket.update({where:{id},data:{deliveryScheduledAt:new Date(input.scheduledAt)}}),this.prisma.ticketActivity.create({data:{ticketId:id,activityType:'DELIVERY_SCHEDULED',description:`Delivery scheduled for ${new Date(input.scheduledAt).toLocaleString()}.`,performedById:userId,performedAt:new Date(),metadata:{scheduledAt:input.scheduledAt,remarks:input.remarks??null}}})]); return this.detail(id); }
  async acknowledgeDelivery(id:string,input:any,userId?:string){ if(!input.acknowledgedBy?.trim())throw new ValidationError('Customer acknowledgement name is required.'); const t=await this.prisma.ticket.findUnique({where:{id},select:{workflowStage:true}}); if(!t)throw new NotFoundError('Ticket was not found.'); if(t.workflowStage!=='RFD')throw new UnprocessableEntityError('Customer acknowledgement can only be recorded once the job card is Ready for Delivery.'); await this.prisma.$transaction([this.prisma.ticket.update({where:{id},data:{customerAcknowledgedAt:new Date(),customerAcknowledgedBy:input.acknowledgedBy.trim()}}),this.prisma.ticketActivity.create({data:{ticketId:id,activityType:'CUSTOMER_ACKNOWLEDGED',description:`Customer acknowledgement recorded from ${input.acknowledgedBy.trim()}.`,performedById:userId,performedAt:new Date(),metadata:{acknowledgedBy:input.acknowledgedBy.trim()}}})]); return this.detail(id); }
  async reopen(id:string,input:any,userId?:string){
    if(!input.remarks?.trim())throw new ValidationError('A reason is required to reopen this ticket.');
    const t=await this.prisma.ticket.findUnique({where:{id},select:{status:{select:{id:true,name:true}},reopenCount:true}});
    if(!t)throw new NotFoundError('Ticket was not found.');
    if(t.status.name!==CLOSED)throw new UnprocessableEntityError('Only a closed ticket can be reopened.');
    if(t.reopenCount>=1)throw new UnprocessableEntityError('This ticket has already been reopened once. Create a follow-up ticket instead.');
    const reopenedStatus=await this.prisma.statusMaster.findFirst({where:{name:{equals:'Reopened',mode:'insensitive'}}});
    if(!reopenedStatus)throw new ValidationError('Reopen target status was not found.');
    await this.prisma.$transaction([
      this.prisma.ticket.update({where:{id},data:{statusId:reopenedStatus.id,closedAt:null,workflowStage:'REOPENED',serviceTlId:null,assignedAt:null,reopenCount:{increment:1},reopenedAt:new Date()}}),
      this.prisma.ticketHistory.create({data:{ticketId:id,oldStatusId:t.status.id,newStatusId:reopenedStatus.id,updatedById:userId,remarks:input.remarks}}),
      this.prisma.ticketActivity.create({data:{ticketId:id,activityType:'TICKET_REOPENED',description:`Ticket reopened by Coordinator for Service Engineer reassignment. Reason: ${input.remarks}`,performedById:userId,performedAt:new Date(),metadata:{remarks:input.remarks}}}),
    ]);
    return this.detail(id);
  }
  /**
   * Coordinator finds a problem with the vehicle at Ready for Delivery and sends it back to the
   * workshop for rework, instead of closing it. Follows the exact same workflow a brand-new ticket
   * goes through from this point on: ticket goes back to SERVICE_TL_REVIEW (same as right after a
   * Coordinator assigns a Service Engineer - serviceTlId is left untouched, so no reassignment step is
   * needed) and the assigned Service Engineer then re-opens the job card via the normal "Workshop
   * Required" action (assigning a technician, same or different) exactly as they would for a new
   * ticket. The job card row itself is reused (see TicketWorkflowRepository.createJobCard's upsert)
   * rather than recreated - JobCard is 1:1 with Ticket in the schema - so it keeps its job card
   * number and all prior diagnostic history (Initial Observation, Root Cause, spare parts, etc.)
   * until the Service Engineer/Technician actively overwrite those fields again during the rework cycle;
   * its workflowStage only flips back to IN_PROGRESS once "Workshop Required" runs again, not here.
   * Any stale delivery scheduling/acknowledgement is cleared since the vehicle is no longer going
   * out. Service Loss Analytics is deliberately left alone - freezeServiceLoss() is already
   * permanently idempotent on rfdAt by design (see schema comment), so a later second RFD will not
   * re-freeze; that is existing, intentional behavior shared with unlock/rework/reopen cycles, not
   * something this action needs to manage.
   */
  async returnToWorkshop(id:string,input:any,userId?:string){
    if(!input.remarks?.trim())throw new ValidationError('A reason is required to return this ticket to the workshop.');
    const t=await this.prisma.ticket.findUnique({where:{id},select:{workflowStage:true,serviceTlId:true,jobCard:{select:{id:true}}}});
    if(!t)throw new NotFoundError('Ticket was not found.');
    if(t.workflowStage!=='RFD')throw new UnprocessableEntityError('Only a ticket that is Ready for Delivery can be returned to the workshop.');
    if(!t.jobCard)throw new UnprocessableEntityError('This ticket has no job card to return to the workshop.');
    if(!t.serviceTlId)throw new UnprocessableEntityError('This ticket has no Service Engineer assigned to return it to.');
    await this.prisma.$transaction([
      this.prisma.ticket.update({where:{id},data:{workflowStage:'SERVICE_TL_REVIEW',deliveryScheduledAt:null,customerAcknowledgedAt:null,customerAcknowledgedBy:null,returnedToWorkshopCount:{increment:1},returnedToWorkshopAt:new Date()}}),
      this.prisma.ticketActivity.create({data:{ticketId:id,activityType:'TICKET_RETURNED_TO_WORKSHOP',description:`Ticket returned to the workshop by Coordinator for rework. Reason: ${input.remarks}`,performedById:userId,performedAt:new Date(),metadata:{remarks:input.remarks,previousTicketStage:'RFD',newTicketStage:'SERVICE_TL_REVIEW'}}}),
    ]);
    return this.detail(id);
  }
  /** The single reopen has already been used and the ticket is Closed again - create a linked follow-up ticket instead, stored under this ticket as the parent. */
  async createFollowUpTicket(id:string,input:any,userId?:string){
    if(!input.issueDescription?.trim())throw new ValidationError('An issue description is required for the follow-up ticket.');
    const parent=await this.prisma.ticket.findUnique({where:{id},select:{ticketNumber:true,customerId:true,deploymentId:true,issueCategoryId:true,reopenCount:true,status:{select:{name:true}}}});
    if(!parent)throw new NotFoundError('Ticket was not found.');
    if(parent.status.name!==CLOSED)throw new UnprocessableEntityError('A follow-up ticket can only be created from a closed ticket.');
    if(parent.reopenCount<1)throw new UnprocessableEntityError('Reopen this ticket first. A follow-up ticket can only be created once the single reopen has already been used.');
    const openStatus=await this.prisma.statusMaster.findFirst({where:{name:{equals:'Open',mode:'insensitive'}}});
    if(!openStatus)throw new ValidationError('Open status was not found.');

    const child=await this.prisma.$transaction(async (tx)=>{
      const ticketNumberPayload=await this.ticketNumberService.generateNextTicketNumber(tx);
      const payload:TicketCreationPayload={
        ticketNumber:ticketNumberPayload.ticketNumber,
        customerId:parent.customerId,
        deploymentId:parent.deploymentId??undefined,
        issueCategoryId:parent.issueCategoryId,
        statusId:openStatus.id,
        source:'ADMIN',
        priority:'MEDIUM',
        issueDescription:input.issueDescription.trim(),
        coordinatorNotes:input.remarks?String(input.remarks).trim():undefined,
        sendUpdate:false,
        notificationStatus:'NOT_SENT',
        deploymentVerified:Boolean(parent.deploymentId),
        rowVersion:1,
        parentTicketId:id,
      };
      const created=await this.ticketRepository.createTicketWithHistoryAndActivity(payload,tx);
      await tx.ticketActivity.create({data:{ticketId:id,activityType:'FOLLOWUP_TICKET_CREATED',description:`Follow-up ticket ${created.ticketNumber} created.`,performedById:userId,performedAt:new Date(),metadata:{followUpTicketId:created.id,followUpTicketNumber:created.ticketNumber}}});
      await tx.ticketActivity.create({data:{ticketId:created.id,activityType:'FOLLOWUP_TICKET_OF',description:`Created as a follow-up of ${parent.ticketNumber}.`,performedById:userId,performedAt:new Date(),metadata:{parentTicketId:id,parentTicketNumber:parent.ticketNumber}}});
      return created;
    });

    return this.detail(child.id);
  }
  async bulkStatus(input:any,userId?:string){ const ids=this.ids(input); for(const id of ids) await this.status(id,input,userId); return {updated:ids.length}; }
  async bulkWorkshop(input:any,userId?:string){ const ids=this.ids(input); for(const id of ids) await this.workshop(id,input,userId); return {updated:ids.length}; }
  async export(input:any){ const ids=this.ids(input); const rows=(await this.prisma.ticket.findMany({where:{id:{in:ids}},select})).map(this.map); if(input.format==='xlsx'){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Tickets');return {content:XLSX.write(wb,{type:'base64',bookType:'xlsx'}),mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',extension:'xlsx'};} return {content:['Ticket Number,Rider,Vehicle,Status,Priority,ETA',...rows.map(r=>[r.ticketNumber,r.customerName,r.vehicleNumber,r.status,r.priority,r.eta??''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n'),mime:'text/csv',extension:'csv'}; }
  private async change(id:string,statusName:string,remarks:string|undefined,userId:string|undefined,event:string){const ticket=await this.ensureOpen(id);const next=await this.prisma.statusMaster.findFirst({where:{name:{equals:statusName,mode:'insensitive'},active:true}});if(!next)throw new ValidationError('Select an active Status Master value.');await this.prisma.$transaction([this.prisma.ticket.update({where:{id},data:{statusId:next.id,closedAt:next.name===CLOSED?new Date():undefined}}),this.prisma.ticketHistory.create({data:{ticketId:id,oldStatusId:ticket.status.id,newStatusId:next.id,updatedById:userId,remarks:remarks??null}}),this.prisma.ticketActivity.create({data:{ticketId:id,activityType:event,description:`Status changed from ${ticket.status.name} to ${next.name}.`,performedById:userId,performedAt:new Date(),metadata:{remarks:remarks??null}}})]);return this.detail(id);}
  private async ensureOpen(id:string){const t=await this.prisma.ticket.findUnique({where:{id},select:{status:{select:{id:true,name:true}}}});if(!t)throw new NotFoundError('Ticket was not found.');if(TERMINAL_STATUSES.includes(t.status.name))throw new UnprocessableEntityError(`${t.status.name} tickets are read-only.`);return t;}
  private ids(input:any){if(!Array.isArray(input.ticketIds)||!input.ticketIds.length)throw new ValidationError('Please select one or more tickets before performing a bulk action.');return input.ticketIds as string[];}
  private effectiveStatus(x:any):string{ return computeTicketEffectiveStatus(x); }
  private chargesIncurred(x:any):string|null{ const value=x.jobCard?.totalCharges??x.finalCharges??x.estimatedCharges??null; return value===null?null:String(value); }
  /** Final Spare Part Billing (Amendment 2): the frozen, consumed-quantity-only amount read
   * straight off the Job Card - never recalculated here. Null until Ready for Deployment. */
  private finalSparePartsAmount(x:any):string|null{ const value=x.jobCard?.finalSparePartsAmount??null; return value===null?null:String(value); }
  private map=(x:any)=>({id:x.id,ticketNumber:x.ticketNumber,customerName:x.customer.name,mobileNumber:x.customer.registeredMobile,vehicleNumber:x.deployment?.vehicleNumber??null,mvTrackNumber:x.deployment?.mvTrackNumber??null,vehicleModel:x.deployment?.vehicleModel?.displayName??null,hub:x.deployment?.hub?.name??null,category:x.issueCategory.name,status:x.status.name,effectiveStatus:this.effectiveStatus(x),priority:x.priority,eta:x.eta?.toISOString()??null,createdAt:x.createdAt.toISOString(),updatedAt:x.updatedAt.toISOString(),technicianId:x.assignedTo?.id??null,technician:x.assignedTo?.name??null,highPriority:x.status.name!==CLOSED&&x.createdAt.getTime()<Date.now()-72*3600000,workflowStage:x.workflowStage,serviceTlId:x.serviceTl?.id??null,serviceTl:x.serviceTl?.name??null,jobCardStage:x.jobCard?.workflowStage??null,jobCardTechnician:x.jobCard?.technician?.name??null,chargesIncurred:this.chargesIncurred(x),finalSparePartsAmount:this.finalSparePartsAmount(x),paymentMode:x.paymentMode??null,paymentUtrNumber:x.paymentUtrNumber??null,paymentAmount:x.paymentAmount===undefined?null:(x.paymentAmount===null?null:String(x.paymentAmount)),paymentRecordedAt:x.paymentRecordedAt?x.paymentRecordedAt.toISOString():null,reopenCount:x.reopenCount??0,reopenedAt:x.reopenedAt?x.reopenedAt.toISOString():null,parentTicket:x.parentTicket?{id:x.parentTicket.id,ticketNumber:x.parentTicket.ticketNumber}:null,followUpTickets:(x.followUpTickets??[]).map((f:any)=>({id:f.id,ticketNumber:f.ticketNumber,status:f.status.name,createdAt:f.createdAt.toISOString()}))});
}
