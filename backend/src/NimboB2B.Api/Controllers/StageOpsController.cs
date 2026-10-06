using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NimboB2B.Api.Auth;
using NimboB2B.Application.Dtos;
using NimboB2B.Application.Services;

namespace NimboB2B.Api.Controllers;

/// One controller that mirrors every stage-ops endpoint the frontend calls.
[ApiController]
[Authorize]
[Route("api/v1")]
public sealed class StageOpsController(StageOpsService svc, CurrentUser me) : ControllerBase
{
    // ── Stage document upload ────────────────────────────────────────────
    [HttpPost("stage-documents/{id:guid}/upload")]
    public async Task<IActionResult> UploadStageDoc(Guid id, [FromBody] StageDocUploadRequest req, CancellationToken ct)
    {
        try { return Ok(await svc.UploadStageDocumentAsync(id, req, me.DisplayName, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    // ── Billing notes ────────────────────────────────────────────────────
    [HttpGet("orders/{orderId}/billing-notes")]
    public async Task<IActionResult> GetBillingNote(string orderId, CancellationToken ct) =>
        Ok(await svc.GetBillingNoteAsync(orderId, ct));

    [HttpPost("orders/{orderId}/billing-notes")]
    public async Task<IActionResult> SaveBillingNote(string orderId, [FromBody] BillingNoteRequest req, CancellationToken ct) =>
        Ok(await svc.SaveBillingNoteAsync(orderId, req.Notes, me.DisplayName, ct));

    // ── Stage skips ──────────────────────────────────────────────────────
    [HttpGet("orders/{orderId}/stage-skips")]
    public async Task<IActionResult> ListSkips(string orderId, CancellationToken ct) =>
        Ok(await svc.ListSkipsAsync(orderId, ct));

    [HttpPost("orders/{orderId}/stage-skips")]
    public async Task<IActionResult> Skip(string orderId, [FromBody] SkipStageRequest req, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        return Ok(await svc.SkipStageAsync(orderId, req.StageId, req.Reason, me.DisplayName, ct));
    }

    [HttpDelete("orders/{orderId}/stage-skips/{stageId}")]
    public async Task<IActionResult> Unskip(string orderId, string stageId, CancellationToken ct)
    {
        await me.RequireAdminOrRajatAsync();
        return Ok(await svc.UnskipStageAsync(orderId, stageId, ct));
    }

    // ── PDI ──────────────────────────────────────────────────────────────
    [HttpGet("orders/{orderId}/pdi/uploads")]
    public async Task<IActionResult> ListPdi(string orderId, CancellationToken ct) =>
        Ok(await svc.ListPdiAsync(orderId, ct));

    [HttpPost("orders/{orderId}/pdi/initial")]
    public async Task<IActionResult> UploadInitialPdi(string orderId, [FromBody] PdiUploadRequest req, CancellationToken ct)
    {
        try { return Ok(await svc.UploadInitialPdiAsync(orderId, req, me.DisplayName, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("orders/{orderId}/pdi/final")]
    public async Task<IActionResult> UploadFinalPdi(string orderId, [FromBody] FileOnlyRequest req, CancellationToken ct) =>
        Ok(await svc.UploadFinalPdiAsync(orderId, req.File, me.DisplayName, ct));

    // ── Invoices ────────────────────────────────────────────────────────
    [HttpGet("orders/{orderId}/invoices/bulk")]
    public async Task<IActionResult> ListBulk(string orderId, CancellationToken ct) => Ok(await svc.ListBulkInvoicesAsync(orderId, ct));

    [HttpPost("orders/{orderId}/invoices/bulk")]
    public async Task<IActionResult> UploadBulk(string orderId, [FromBody] FileOnlyRequest req, CancellationToken ct) =>
        Ok(await svc.UploadBulkInvoiceAsync(orderId, req.File, me.DisplayName, ct));

    [HttpPost("orders/{orderId}/invoices/bulk-zip")]
    public async Task<IActionResult> UploadBulkZip(string orderId, [FromBody] FileOnlyRequest req, CancellationToken ct)
    {
        try { return Ok(await svc.UploadBulkInvoiceZipAsync(orderId, req.File, me.DisplayName, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("orders/{orderId}/invoices/individual")]
    public async Task<IActionResult> ListIndividual(string orderId, CancellationToken ct) =>
        Ok(await svc.ListIndividualInvoicesAsync(orderId, ct));

    [HttpPost("orders/{orderId}/invoices/individual/preview")]
    public async Task<IActionResult> PreviewIndividual(string orderId, [FromBody] MatchPreviewRequest req, CancellationToken ct) =>
        Ok(await svc.PreviewIndividualInvoiceMatchAsync(orderId, req.FileNames, ct));

    [HttpPost("orders/{orderId}/invoices/individual/confirm")]
    public async Task<IActionResult> ConfirmIndividual(string orderId, [FromBody] MatchConfirmRequest req, CancellationToken ct) =>
        Ok(await svc.ConfirmIndividualInvoiceUploadAsync(orderId, req.Files, me.DisplayName, ct));

    // ── Forms ───────────────────────────────────────────────────────────
    [HttpGet("orders/{orderId}/forms")]
    public async Task<IActionResult> ListForms(string orderId, CancellationToken ct) => Ok(await svc.ListFormDocumentsAsync(orderId, ct));

    [HttpPost("orders/{orderId}/forms")]
    public async Task<IActionResult> UploadForm(string orderId, [FromBody] FormUploadRequest req, CancellationToken ct)
    {
        try { return Ok(await svc.UploadFormAsync(orderId, req, me.DisplayName, ct)); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    // ── RTO ─────────────────────────────────────────────────────────────
    [HttpGet("orders/{orderId}/rto/slips")]
    public async Task<IActionResult> ListRto(string orderId, CancellationToken ct) => Ok(await svc.ListRtoSlipsAsync(orderId, ct));

    [HttpPost("orders/{orderId}/rto/slips/preview")]
    public async Task<IActionResult> PreviewRto(string orderId, [FromBody] MatchPreviewRequest req, CancellationToken ct) =>
        Ok(await svc.PreviewRtoSlipMatchAsync(orderId, req.FileNames, ct));

    [HttpPost("orders/{orderId}/rto/slips/confirm")]
    public async Task<IActionResult> ConfirmRto(string orderId, [FromBody] MatchConfirmRequest req, CancellationToken ct) =>
        Ok(await svc.ConfirmRtoSlipUploadAsync(orderId, req.Files, me.DisplayName, ct));

    [HttpGet("orders/{orderId}/rto/excel")]
    public async Task<IActionResult> ListRtoExcel(string orderId, CancellationToken ct) => Ok(await svc.ListRtoExcelAsync(orderId, ct));

    [HttpPost("orders/{orderId}/rto/excel")]
    public async Task<IActionResult> UploadRtoExcel(string orderId, [FromBody] FileOnlyRequest req, CancellationToken ct) =>
        Ok(await svc.UploadRtoExcelAsync(orderId, req.File, me.DisplayName, ct));

    // ── Insurance (order-scoped Excel + PDF flows) ───────────────────────
    [HttpGet("orders/{orderId}/insurance/policies")]
    public async Task<IActionResult> ListInsPolicies(string orderId, CancellationToken ct) => Ok(await svc.ListInsurancePoliciesAsync(orderId, ct));

    [HttpPost("orders/{orderId}/insurance/policies/preview")]
    public async Task<IActionResult> PreviewInsPolicies(string orderId, [FromBody] MatchPreviewRequest req, CancellationToken ct) =>
        Ok(await svc.PreviewInsurancePolicyMatchAsync(orderId, req.FileNames, ct));

    [HttpPost("orders/{orderId}/insurance/policies/confirm")]
    public async Task<IActionResult> ConfirmInsPolicies(string orderId, [FromBody] MatchConfirmRequest req, CancellationToken ct) =>
        Ok(await svc.ConfirmInsurancePolicyUploadAsync(orderId, req.Files, me.DisplayName, ct));

    [HttpGet("orders/{orderId}/insurance/excel")]
    public async Task<IActionResult> ListInsExcel(string orderId, CancellationToken ct) => Ok(await svc.ListInsuranceExcelAsync(orderId, ct));

    [HttpPost("orders/{orderId}/insurance/excel")]
    public async Task<IActionResult> UploadInsExcel(string orderId, [FromBody] FileOnlyRequest req, CancellationToken ct) =>
        Ok(await svc.UploadInsuranceExcelAsync(orderId, req.File, me.DisplayName, ct));

    // ── Final PDI verification ──────────────────────────────────────────
    [HttpGet("orders/{orderId}/final-pdi/verifications")]
    public async Task<IActionResult> ListFinalPdi(string orderId, CancellationToken ct) => Ok(await svc.ListFinalPdiVerificationsAsync(orderId, ct));

    [HttpPost("orders/{orderId}/final-pdi/verify")]
    public async Task<IActionResult> RunFinalPdi(string orderId, CancellationToken ct) =>
        Ok(await svc.RunFinalPdiVerificationAsync(orderId, ct));

    // ── Misc docs ───────────────────────────────────────────────────────
    [HttpGet("orders/{orderId}/misc-docs")]
    public async Task<IActionResult> ListMisc(string orderId, CancellationToken ct) => Ok(await svc.ListMiscAsync(orderId, ct));

    [HttpPost("orders/{orderId}/misc-docs")]
    public async Task<IActionResult> UploadMisc(string orderId, [FromBody] MiscUploadRequest req, CancellationToken ct) =>
        Ok(await svc.UploadMiscAsync(orderId, req, me.DisplayName, ct));

    // ── UI hint endpoints ───────────────────────────────────────────────
    [HttpGet("orders/{orderId}/has-registration")]
    public async Task<IActionResult> HasReg(string orderId, CancellationToken ct) =>
        Ok(new { has = await svc.HasAnyRegistrationAsync(orderId, ct) });

    [HttpGet("orders/{orderId}/has-policy-number")]
    public async Task<IActionResult> HasPol(string orderId, CancellationToken ct) =>
        Ok(new { has = await svc.HasAnyPolicyNumberAsync(orderId, ct) });

    // ── ZIP download ────────────────────────────────────────────────────
    [HttpPost("orders/{orderId}/download-zip")]
    public async Task<IActionResult> DownloadZip(string orderId, CancellationToken ct) =>
        Ok(await svc.DownloadOrderZipAsync(orderId, ct));
}
