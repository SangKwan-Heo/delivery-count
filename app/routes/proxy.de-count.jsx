import { authenticate, unauthenticated } from "../shopify.server";

const LIMIT = 1;

export async function loader({ request }) {
  try {
    const { session } = await authenticate.public.appProxy(request);

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const time = url.searchParams.get("time");

    if (!date || !time) {
      return Response.json({
        available: false,
        count: 0,
        limit: LIMIT,
        message: "Date and time are required.",
      });
    }

    const timeTag = time
  .replace(/\s+/g, "")
  .replace(/[()]/g, "")
  .replace(/[^a-zA-Z0-9]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase();

    const dateTag = `date-${date}`;
    const fullTimeTag = `time-${timeTag}`;

    const { admin } = await unauthenticated.admin(session.shop);

    const response = await admin.graphql(
      `#graphql
        query GetOrdersByDeliveryTag($query: String!) {
          orders(first: 250, query: $query) {
            nodes {
              id
              name
              tags
            }
          }
        }
      `,
      {
        variables: {
          query: `tag:${dateTag}`,
        },
      }
    );

    const result = await response.json();
    const orders = result.data.orders.nodes || [];

    const count = orders.filter((order) =>
  order.tags.includes(fullTimeTag)
).length;

    return Response.json({
      available: count < LIMIT,
      count,
      limit: LIMIT,
      message:
        count < LIMIT
          ? "Available"
          : "This delivery time is fully booked. Please select another time.",
    });
  } catch (error) {
    console.error("DE-COUNT ERROR MESSAGE:", error.message);

    return Response.json(
      {
        available: false,
        count: 0,
        limit: LIMIT,
        message: error.message,
      },
      { status: 500 }
    );
  }
}