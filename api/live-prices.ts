/// <reference path="./mjs-modules.d.ts" />
import fs from "fs";
import path from "path";

export default async function handler(req: any, res: any) {
  try {
    const filePath = path.resolve(process.cwd(), "artifacts/givit-platform/src/lib/data/live-prices.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.status(200).send(content);
    } else {
      res.status(200).json({});
    }
  } catch (error) {
    res.status(200).json({});
  }
}
