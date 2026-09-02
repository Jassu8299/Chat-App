const express = require('express')
const app = express()
const dotenv = require('dotenv')
const cookieparser = require('cookie-parser')
const cors = require('cors')
const connectDB = require('./config/DBconnect')
const bodyParser = require('body-parser')
const authRoute = require('./routes/authRoute')
const chatRoute = require('./routes/chatRoute')
const statusRoute = require('./routes/statusRoute')
const initializeSocket = require('./services/socketService')
const http = require('http')

dotenv.config()

const corsOptions = {
  origin: process.env.PORT,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}

app.use(cors(corsOptions))

app.post('/', (req, res) => {
  res.send('server running')
})

const port = process.env.PORT || 8002
app.use(cors())
app.use(express.json())
app.use(cookieparser())
app.use(bodyParser.urlencoded({extended: true}))
connectDB()

const server = http.createServer(app)

const io = initializeSocket(server)

app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
})

app.use('/api/auth', authRoute)
app.use('/api/chat', chatRoute)
app.use('/api/status', statusRoute)

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

//9HvbutlSoNEpUu12

