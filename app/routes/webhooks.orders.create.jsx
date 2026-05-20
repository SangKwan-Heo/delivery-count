import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function action({ request }) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  if (topic !== "ORDERS_CREATE") {
    return new Response("Wrong topic", { status: 400 });
  }

  const attrs = payload.note_attributes || payload.customAttributes || [];

  const deliveryDate = attrs.find((a) => a.name === "Date" || a.key === "Date")?.value;
  const deliveryTime = attrs.find((a) => a.name === "Time" || a.key === "Time")?.value;

  if (!deliveryDate || !deliveryTime) {
    return new Response("No delivery info", { status: 200 });
  }

  await db.deliverySlot.upsert({
    where: {
      orderId: String(payload.id),
    },
    update: {
      shop,
      orderName: payload.name,
      deliveryDate,
      deliveryTime,
    },
    create: {
      shop,
      orderId: String(payload.id),
      orderName: payload.name,
      deliveryDate,
      deliveryTime,
    },
  });

  return new Response("OK", { status: 200 });
}