import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "../.env"
});

connectDB()
.then(()=> {
    const PORT = (process.env.PORT || 3000)
    app.listen(PORT, ()=> {
        console.log(`App is listening on PORT : ${PORT}`);
    })
})
.catch((err)=>{
    console.error(`ERROR : ${err}`);
})



