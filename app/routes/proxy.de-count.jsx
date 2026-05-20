import { authenticate } from "../shopify.server";

const LIMIT = 25;

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.public.appProxy(request);

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const time = url.searchParams.get("time");

    if (!date || !time) {
      return Response.json({ available: false, message: "Date and time are required." });
    }

    const response = await admin.graphql(
      `#graphql
        query {
          orders(first: 100, query: "status:any") {
            nodes {
              id
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
    const orders = result.data.orders.nodes;

    const count = orders.filter((order) => {
      const attrs = order.customAttributes || [];
      const deliveryDate = attrs.find((a) => a.key === "Delivery Date")?.value;
      const deliveryTime = attrs.find((a) => a.key === "Delivery Time")?.value;

      return deliveryDate === date && deliveryTime === time;
    }).length;


    return Response.json({
      available: count < LIMIT,
      count,
      limit: LIMIT,
      message:
        count < LIMIT
          ? "Available"
          : "This delivery time is fully booked. Please select another time."
    });
    
  } catch (error) {
    console.error("DE-COUNT ERROR MESSAGE:", error.message);
    console.error("DE-COUNT GRAPHQL ERRORS:", JSON.stringify(error.graphqlErrors, null, 2));

    return Response.json({
      available: false,
      count: 0,
      limit: LIMIT,
      message: error.message,
      graphqlErrors: error.graphqlErrors || []
    }, { status: 500 });
  }
}