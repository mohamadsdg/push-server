import type { NextApiRequest, NextApiResponse } from "next";

const middleware = (req: NextApiRequest, res: NextApiResponse, fn: any) => {
  return new Promise((resolve, reject) => {
    return fn(req, res, (resualt: any) => {
      if (resualt instanceof Error) {
        return reject(resualt);
      }
      return resolve(resualt);
    });
  });
};

export default middleware;
