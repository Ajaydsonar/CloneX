import dotenv from "dotenv";

import { app } from "./app.js";
import { connectDB } from "./db/index.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("express error : ", err);
      throw err;
    });

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Your Server is listening On PORT :${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Failed : ", error);
  });
