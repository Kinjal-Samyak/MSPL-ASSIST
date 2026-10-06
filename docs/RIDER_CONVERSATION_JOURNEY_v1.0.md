# Rider Conversation Journey (Frozen v1.0)

This is the rider-facing language standard for the future channel-independent Conversation Engine. It is currently documentation and shadow-engine guidance only; it does not change the live WhatsApp or ticket-creation flows.

## Journey

1. **Enter your mobile number** — “Please enter the rider's registered mobile number.” Search by mobile number and retrieve Rider Name, MV Track Number, Vehicle Model, Vehicle Type, Registration Number for High Speed vehicles only, and Hub. If not found: “We couldn't find a rider with this mobile number.” Actions: Search Again or Cancel.
2. **Is this your vehicle?** — Display MV Track Number and Vehicle Model for Micro Mobility; also display Registration Number for High Speed. Ask: “Is this the vehicle that has the problem?” Actions: Yes or Search Again.
3. **Can you ride the vehicle?** — Required answer. Actions: “Yes, I can ride it.” or “No, it is stopped.”
4. **What is the problem?** — Display active Admin-managed Issue Categories. Never hard-code options.
5. **Tell us more about the problem** — Display active subcategories belonging to the selected category. Never hard-code mappings.
6. **Is there another issue?** — Add Another repeats the problem/subproblem pair; No, Continue proceeds. One ticket can contain multiple issue groups.
7. **Anything else you want to tell us?** — Optional rider remarks, maximum 200 words.
8. **Upload a photo** — Optional. Explain that photos can help the service team understand the problem faster. Actions: Upload Photo or Skip.
9. **Please check your details** — Read-only review of rider-provided information and system information. Actions: Edit, Create Ticket, or Cancel.
10. **Success** — Confirm ticket number and current status; state that updates will arrive through WhatsApp. Actions: View Ticket, Create Another Ticket, or Back to Tickets.

## Frozen terminology and display rules

- Use **MV Track Number** in all rider-facing copy; never use “Vehicle Number.”
- Show **Registration Number** only for High Speed vehicles, alongside MV Track Number.
- Vehicle Type is retrieved from Vehicle Model Master; it is never inferred.
- Rider-facing copy uses questions such as “What is the problem?” and “Tell us more about the problem.” Internal terms Issue Category and Issue Subcategory remain for code and Admin.
- Issue Categories and Issue Subcategories are fully Admin-managed.
