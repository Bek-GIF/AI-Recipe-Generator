import { useState, type FormEvent } from 'react'
import type { Recipe } from '../shared/recipe.ts'

async function fetchRecipe(ingredients: string): Promise<Recipe> {
  let response: Response
  try {
    response = await fetch('/api/recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
    })
  } catch {
    throw new Error('Нет связи с сервером. Проверьте подключение к интернету.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.recipe) {
    throw new Error(data?.error ?? 'Не удалось получить рецепт. Попробуйте ещё раз.')
  }
  return data.recipe
}

function App() {
  const [ingredients, setIngredients] = useState('')
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!ingredients.split(',').some((item) => item.trim())) {
      setError('Введите хотя бы один продукт, например: картошка, яйца, сыр.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      setRecipe(await fetchRecipe(ingredients))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <span className="hero__emoji" aria-hidden="true">🍳</span>
        <h1>Что приготовим сегодня?</h1>
        <p>Перечислите продукты, которые есть дома, — ИИ придумает рецепт.</p>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="ingredients" className="visually-hidden">
          Продукты через запятую
        </label>
        <input
          id="ingredients"
          className="form__input"
          type="text"
          placeholder="Например: картошка, яйца, сыр"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          disabled={loading}
          maxLength={500}
          autoComplete="off"
        />
        <button className="form__button" type="submit" disabled={loading}>
          {loading ? 'Придумываем…' : 'Придумать рецепт'}
        </button>
      </form>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="loader" role="status">
          <span className="loader__spinner" aria-hidden="true" />
          ИИ придумывает рецепт…
        </div>
      )}

      {recipe && !loading && (
        <article className="card">
          <h2 className="card__title">{recipe.title}</h2>
          <p className="card__description">{recipe.description}</p>
          <p className="card__time">⏱ {recipe.cookingTime}</p>

          <section>
            <h3>Ингредиенты</h3>
            <ul className="card__ingredients">
              {recipe.ingredients.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Приготовление</h3>
            <ol className="card__steps">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        </article>
      )}
    </main>
  )
}

export default App
