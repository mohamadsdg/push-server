import type { NextApiRequest, NextApiResponse } from "next";
import webPush, { PushSubscription } from "web-push";
import cors from "cors";

import middleware from "../../lib/middleware";

type SubscriptionType = {
  [key in string]: {
    endpoint: string;
    keys: {
      auth: string;
      p256dh: string;
    };
  };
};
async function getSubscription(): Promise<SubscriptionType> {
  const url =
    "https://pwgram-30323-default-rtdb.asia-southeast1.firebasedatabase.app/subscriptions.json";
  return await fetch(url)
    .then((rsp) => rsp.json())
    .then((payload) => payload);
}
async function sendNotification(
  pushConfig: PushSubscription,
  body: { title: string; content: string }
) {
  try {
    return await webPush
      .sendNotification(
        pushConfig,
        JSON.stringify({
          title: body.title ?? "New Post",
          content: body.content ?? "New Post Added !",
        })
      )
      .then((rsp) => {
        console.log("sendNotification response :", rsp);
      })
      .catch((err) => {
        console.log("sendNotification error :", err);
      });
  } catch (error) {
    console.log("sendNotification catch : ", error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await middleware(req, res, cors());

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const { body } = req;

  try {
    const payload = await fetch(
      "https://pwgram-30323-default-rtdb.asia-southeast1.firebasedatabase.app/posts.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: body.id,
          title: body.title,
          location: body.location,
          image:
            "https://firebasestorage.googleapis.com/v0/b/pwgram-30323.appspot.com/o/sf-boat.jpg?alt=media&token=c2fa4ba0-bfca-419b-acc9-b016e78d956c",
        }),
      }
    );

    // setup web push
    try {
      webPush.setVapidDetails(
        "mailto:test@test.org",
        process.env.PUSH_PUBLIC as string,
        process.env.PUSH_PRIVATE as string
      );
    } catch (error) {
      console.log("setVapidDetails : ", error);
    }

    // get all subscription
    const subs = await getSubscription();

    // send notif to all subscription
    for (const key in subs) {
      if (Object.prototype.hasOwnProperty.call(subs, key)) {
        sendNotification(
          {
            endpoint: subs[key].endpoint,
            keys: {
              auth: subs[key].keys.auth,
              p256dh: subs[key].keys.p256dh,
            },
          },
          { title: body.title, content: body.location }
        );
      }
    }

    // send response endpoint
    const rsp = await payload.json();
    if (rsp.ok) {
      console.info("save successfully ");
    }
    return res.status(201).json(rsp);
  } catch (error) {
    console.log("handler : ", error);
    res.status(500).json({ error });
  }
}
