import { authenticate, unauthenticated } from "../shopify.server";

const LIMIT = 25;

export async function loader({ request }) {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session?.shop) {
      throw new Error("No shop from app proxy session");
    }

    const adminContext = await unauthenticated.admin(session.shop);

    if (!adminContext?.admin) {
      throw new Error("No admin client. Reinstall app on this store.");
    }

    const admin = adminContext.admin;

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

    const response = await admin.graphql(
      `#graphql
        query {
          orders(first: 100, sortKey: CREATED_AT, reverse: true) {
            nodes {
              id
              name
              customAttributes {
                key
                value
              }
            }
          }
        }
      `
    );

    const result = await response.json();
    const orders = result.data?.orders?.nodes || [];

    const count = orders.filter((order) => {
      const attrs = order.customAttributes || [];
      const deliveryDate = attrs.find((a) => a.key === "Date")?.value;
      const deliveryTime = attrs.find((a) => a.key === "Time")?.value;

      return deliveryDate === date && deliveryTime === time;
    }).length;

    return Response.json({
      available: count < LIMIT,
      count,
      limit: LIMIT,
      message:
        count < LIMIT
          ? "Available"
          : "This time is fully booked. Please select another time.",
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