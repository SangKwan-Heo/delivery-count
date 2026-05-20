import { authenticate, apiVersion } from "../shopify.server";
import { shopifyApi } from "@shopify/shopify-api";

const LIMIT = 25;

export async function loader({ request }) {
  try {
    const { session } = await authenticate.public.appProxy(request);

    if (!session?.accessToken || !session?.shop) {
      throw new Error("No app proxy session or access token");
    }

    const client = new shopifyApi.clients.Graphql({
      session,
      apiVersion,
    });

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const time = url.searchParams.get("time");

    if (!date || !time) {
      return Response.json({
        available: false,
        message: "Date and time are required.",
      });
    }

    const response = await client.query({
      data: `#graphql
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
      `,
    });

    const orders = response.body.data.orders.nodes;

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
      message: count < LIMIT ? "Available" : "This delivery time is fully booked.",
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