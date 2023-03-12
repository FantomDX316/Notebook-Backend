const connectToMongo = require('./db_connect');
const express = require('express');
const cors = require('cors');


connectToMongo();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',require("./Routes/routes.js"));
app.use('/api/notes',require("./Routes/notes_route.js"));



app.listen(process.env.PORT,()=>{
    console.log(`App is listening at ${process.env.BASE_URL}`);
});


