import { envConfig } from "./configs/env";
import app from "./app";

const PORT = envConfig.PORT ?? 8400 ;

app.listen(PORT, () => {
    console.log(`server running on ${PORT}`)
})