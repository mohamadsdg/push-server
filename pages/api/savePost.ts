// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import cors from "cors";

import middleware from "../../lib/middleware";

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
    const rsp = await payload.json();

    if (rsp.ok) {
      console.info("save successfully ");
    }
    return res.status(201).json(rsp);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
}
