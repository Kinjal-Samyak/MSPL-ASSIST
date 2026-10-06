# Conversation State Model

The web Conversation Engine has one reducer-backed state source: `useTicketConversation`. The hook is a Web Adapter over the pure `@mspl/conversation-workflow` workspace package. Presentation components read this model and request state transitions; they do not own draft state.

`Ticket domain -> Conversation Workflow Engine -> Web Adapter -> React UI`

## State owned by the model

- Current step and submission status
- Search query, search results, selected Rider, active deployment vehicles, and selected vehicle
- Rideability
- Master-managed categories, subcategories, selected category, and ordered issue groups
- Remarks and locally selected photos
- Channel metadata (`WEB`, conversation start time)
- Step-level validation and API error messages
- Ticket creation result

## Step flow

`Find Rider -> Confirm Vehicle -> Rideability -> Problem -> Problem Detail -> Issue Groups -> Remarks -> Photos -> Review -> Success`

The step model supports backward navigation and editing without clearing the draft. `Exit & Resume Later` closes the modal without resetting its state. `Cancel`, successful completion followed by Back to Tickets, selecting a different Rider, and Create Another Ticket reset state and release local photo-preview URLs.

## Validation gates

`@mspl/conversation-workflow` owns deterministic Next, Back, Edit, and completion decisions. The pure `conversation.validation.ts` Web Adapter projects the web draft into that engine; it does not duplicate validation rules.

- Rider and active vehicle must be selected.
- Rideability must be selected.
- A category and valid subcategory must be selected before an issue can be added.
- At least one issue group is required.
- Remarks may contain at most 200 words.
- Review validates the complete submission payload before the API call.

## Issue groups

Issue groups are ordered and deduplicated by category plus subcategory. They can be added, edited, removed, and reordered before submission.

## Photo lifecycle

Photos are validated client-side (JPG, PNG, or WebP; maximum 5 MB), receive local previews, and can be removed. Object URLs are revoked on removal, cancellation, Rider change, and component unmount to avoid retained browser memory.

The current production backend accepts attachment *references*, not binary uploads. The web client therefore persists the existing attachment-reference format when a ticket is submitted. A future binary-storage API is required before real upload-byte progress or per-file upload retry can be implemented without changing the backend contract.
