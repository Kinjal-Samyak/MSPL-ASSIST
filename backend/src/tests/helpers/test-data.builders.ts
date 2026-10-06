import { ConversationState } from "../../conversations/conversation.state";
import type { ConversationContextData, RegisteredCustomer, SelectedIssue, VerifiedDeployment } from "../../conversations/conversation-context";

export class TestCustomerBuilder {
  private customer: RegisteredCustomer = {
    mobile: "9876543210",
    customerId: "cust-1",
    customerName: "Rider One",
    verified: true,
  };

  withMobile(mobile: string): TestCustomerBuilder {
    this.customer.mobile = mobile;
    return this;
  }

  withoutCustomerId(): TestCustomerBuilder {
    delete this.customer.customerId;
    return this;
  }

  unverified(): TestCustomerBuilder {
    this.customer.verified = false;
    return this;
  }

  build(): RegisteredCustomer {
    return { ...this.customer };
  }
}

export class TestDeploymentBuilder {
  private deployment: VerifiedDeployment = {
    deploymentId: "dep-1",
    vehicleId: "veh-1",
    vehicleNumber: "WB12AB1234",
    vehicleModel: "M7",
    hubId: "hub-1",
    hubName: "Kolkata Hub",
    rentalStatus: "ACTIVE",
    startDate: "2026-07-09",
  };

  withVehicleNumber(vehicleNumber: string): TestDeploymentBuilder {
    this.deployment.vehicleNumber = vehicleNumber;
    return this;
  }

  build(): VerifiedDeployment {
    return { ...this.deployment };
  }
}

export class TestIssueBuilder {
  private issue: SelectedIssue = {
    issueCategoryId: "issue-1",
    issueCategoryName: "Battery",
    description: "Battery drains quickly during rides",
    photoUrls: [],
  };

  withCategory(id: string, name: string): TestIssueBuilder {
    this.issue.issueCategoryId = id;
    this.issue.issueCategoryName = name;
    return this;
  }

  withDescription(description: string): TestIssueBuilder {
    this.issue.description = description;
    return this;
  }

  withPhotos(photoUrls: string[]): TestIssueBuilder {
    this.issue.photoUrls = photoUrls;
    return this;
  }

  build(): SelectedIssue {
    return { ...this.issue };
  }
}

export class TestConversationBuilder {
  private data: ConversationContextData = {};

  withCustomer(customer: RegisteredCustomer): TestConversationBuilder {
    this.data.registeredCustomer = customer;
    return this;
  }

  withDeployment(deployment: VerifiedDeployment): TestConversationBuilder {
    this.data.activeDeployment = deployment;
    return this;
  }

  withIssues(issues: SelectedIssue[]): TestConversationBuilder {
    this.data.selectedIssues = issues;
    return this;
  }

  withTicket(ticket: { ticketId: string; ticketNumber: string; status: string; createdAt: string }): TestConversationBuilder {
    this.data.ticket = ticket;
    return this;
  }

  build(): ConversationContextData {
    return { ...this.data };
  }
}

export const defaultIssueCategories = [
  { id: "issue-1", name: "Battery" },
  { id: "issue-2", name: "Brake" },
  { id: "issue-3", name: "Motor" },
];

export const reviewState = ConversationState.REVIEW_TICKET;
