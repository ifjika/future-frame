import 'dotenv/config'
import Fastify from 'fastify'

const app = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true
            }
        }   
    }
})

app.get('/health', async () => {
    return {
        status: 'ok',
        service: 'FutureFrame API Gateway',
        timeStamp: new Date().toISOString()
    }
})

const start = async (): Promise<void> => {
    try {
        const port = Number(process.env['PORT'] ?? 3000)
        const host = process.env['HOST'] ?? '0.0.0.0'
        await app.listen({ port, host })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

void start()