import type { NextApiRequest, NextApiResponse } from "next";
import webPush, { PushSubscription } from "web-push";
import cors from "cors";
import formidable, { File } from "formidable";
import fs from "fs";

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
  body: { title: string; content: string; openUrl?: string; img?: string }
) {
  try {
    return await webPush
      .sendNotification(
        pushConfig,
        JSON.stringify({
          title: body.title ?? "New Post",
          content: body.content ?? "New Post Added !",
          url: "/",
          img: body.img,
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
async function saveFile(file: File) {
  // console.log("file", file);
  try {
    const data = fs.readFileSync(file.filepath);
    fs.writeFileSync(`./public/upload/${file.newFilename}.jpeg`, data);
    await fs.unlinkSync(file.filepath);
    return `${process.env.APP}/upload/${file.newFilename}.jpeg`;
  } catch (error) {
    console.log("saveFile->error", error);
    // throw new Error("failed save file ");
  }
}
//
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await middleware(req, res, cors());

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  let body: {
    filePath: string;
    id: undefined | string | string[];
    title: undefined | string | string[];
    location: undefined | string | string[];
    rawLocation: {
      lat: undefined | number | string;
      lng: undefined | number | string;
    };
  } = {
    filePath: "",
    id: undefined,
    title: undefined,
    location: undefined,
    rawLocation: {
      lat: undefined,
      lng: undefined,
    },
  };

  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async function (err, fields, files) {
      if (err) res.status(500).json({ error: err });
      console.log("formidable", fields, files);
      const filePath = (await saveFile(files.file as File)) as string;
      body = {
        filePath,
        id: fields.id,
        location: fields.location,
        title: fields.title,
        rawLocation: {
          lat: fields.rawLocationLat as string,
          lng: fields.rawLocationLng as string,
        },
      };

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
            image: body.filePath,
            rawLocation: {
              lat: body.rawLocation.lat as string,
              lng: body.rawLocation.lng as string,
            },
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
            {
              title: body.title as string,
              content: body.location as string,
              img: body.filePath,
            }
          );
        }
      }

      // send response endpoint
      const rsp = await payload.json();
      if (rsp.ok) {
        console.info("save successfully ");
      }
      return res.status(201).json(rsp);
    });
  } catch (error) {
    console.log("handler : ", error);
    res.status(500).json({ error });
  }
}
