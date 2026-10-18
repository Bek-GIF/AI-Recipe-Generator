import { z } from 'zod'

export const RecipeSchema = z.object({
  title: z.string().describe('Название блюда'),
  description: z.string().describe('Краткое описание блюда, 1–2 предложения'),
  ingredients: z
    .array(z.string())
    .describe('Список необходимых ингредиентов с количеством'),
  steps: z.array(z.string()).describe('Пошаговый способ приготовления'),
  cookingTime: z.string().describe('Примерное время приготовления, например «30 минут»'),
})

export type Recipe = z.infer<typeof RecipeSchema>
