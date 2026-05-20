import { authenticate, unauthenticated } from "../shopify.server";

export async function action({ request }) {
  try {
    console.log("ORDER WEBHOOK START");

    const { shop, payload } = await authenticate.webhook(request);

    console.log("WEBHOOK SHOP:", shop);
    console.log("ORDER ID:", payload.id);
    console.log("ORDER GID:", payload.admin_graphql_api_id);
    console.log("NOTE ATTRIBUTES:", JSON.stringify(payload.note_attributes));

    const attrs = payload.note_attributes || [];

    const deliveryDate = attrs.find((a) => a.name === "Date")?.value;
    const deliveryTime = attrs.find((a) => a.name === "Time")?.value;

    console.log("DELIVERY DATE:", deliveryDate);
    console.log("DELIVERY TIME:", deliveryTime);

    if (!deliveryDate || !deliveryTime) {
      return new Response("No delivery info", { status: 200 });
    }

    const timeTag = deliveryTime
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();

    const tags = [
      `date-${deliveryDate}`,
      `time-${timeTag}`,
    ];

    console.log("TAGS TO ADD:", tags);

    const { admin } = await unauthenticated.admin(shop);

    const response = await admin.graphql(
      `#graphql
        mutation AddOrderTags($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            node {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          id: payload.admin_graphql_api_id,
          tags,
        },
      }
    );

    const result = await response.json();

    console.log("TAGS ADD RESULT:", JSON.stringify(result));

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("ORDER WEBHOOK ERROR:", error.message);
    return new Response("Webhook error", { status: 500 });
  }
}