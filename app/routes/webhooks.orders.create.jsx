import { authenticate, unauthenticated } from "../shopify.server";

export async function action({ request }) {
  try {
    const { shop, payload } = await authenticate.webhook(request);

    const attrs = payload.note_attributes || [];

    const deliveryDate = attrs.find((a) => a.name === "Date")?.value;
    const deliveryTime = attrs.find((a) => a.name === "Time")?.value;

    if (!deliveryDate || !deliveryTime) {
      return new Response("No delivery info", { status: 200 });
    }

    const timeTag = deliveryTime
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    const tags = [
      `delivery-date-${deliveryDate}`,
      `delivery-time-${timeTag}`,
    ];

    const { admin } = await unauthenticated.admin(shop);

    await admin.graphql(
      `#graphql
        mutation AddOrderTags($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
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

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("ORDER WEBHOOK ERROR:", error.message);
    return new Response("Webhook error", { status: 500 });
  }
}