import { authenticate } from "../shopify.server";
import db from "../db.server";

const LIMIT = 25;

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

    const count = await db.deliverySlot.count({
      where: {
        shop: session.shop,
        deliveryDate: date,
        deliveryTime: time,
      },
    });

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