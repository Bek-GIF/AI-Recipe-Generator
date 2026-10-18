import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { RecipeSchema } from '../shared/recipe.ts'

const PORT = Number(process.env.PORT ?? 3001)
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5'
const MAX_INPUT_LENGTH = 500

// The API key is read from ANTHROPIC_API_KEY on the server only and never reaches the browser.
const client = new Anthropic()
const app = express()
app.use(express.json({ limit: '10kb' }))

const SYSTEM_PROMPT = `Ты — опытный шеф-повар. Пользователь перечисляет продукты, которые есть у него дома.
Придумай одно реальное, вкусное и выполнимое блюдо, в основе которого лежат именно эти продукты.
Можно добавлять только базовые продукты, которые почти всегда есть дома (соль, перец, растительное масло, вода, сахар).
Если среди введённого есть что-то несъедобное, просто не используй это.
Отвечай на русском языке. Шаги должны быть конкретными и понятными новичку.`

app.post('/api/recipe', async (req, res) => {
  const raw = typeof req.body?.ingredients === 'string' ? req.body.ingredients : ''
  const ingredients = raw
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  if (ingredients.length === 0) {
    res.status(400).json({ error: 'Введите хотя бы один продукт.' })
    return
  }
  if (raw.length > MAX_INPUT_LENGTH) {
    res.status(400).json({ error: `Слишком длинный список (максимум ${MAX_INPUT_LENGTH} символов).` })
    return
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Сервер не настроен: не задан ANTHROPIC_API_KEY.' })
    return
  }

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'low', format: zodOutputFormat(RecipeSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Мои продукты: ${ingredients.join(', ')}` }],
    })

    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      res.status(502).json({ error: 'ИИ не смог придумать рецепт. Попробуйте изменить список продуктов.' })
      return
    }
    res.json({ recipe: response.parsed_output })
  } catch (err) {
    console.error('Recipe generation failed:', err)
    if (err instanceof Anthropic.AuthenticationError) {
      res.status(500).json({ error: 'Сервер не настроен: неверный или отсутствующий API-ключ.' })
    } else if (err instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'Слишком много запросов. Подождите немного и попробуйте снова.' })
    } else if (err instanceof Anthropic.APIConnectionError) {
      res.status(503).json({ error: 'Не удалось связаться с ИИ. Проверьте подключение и попробуйте снова.' })
    } else {
      res.status(500).json({ error: 'Не удалось сгенерировать рецепт. Попробуйте ещё раз.' })
    }
  }
})

// In production, serve the built frontend from the same server.
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
app.use(express.static(distDir))
app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT} (model ${MODEL})`))
