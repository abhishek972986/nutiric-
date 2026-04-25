type QueryResponse = {
  data: unknown
  error: null | Error
  count?: number
}

function createQueryResponse(mode: 'many' | 'single' = 'many'): Promise<QueryResponse> {
  if (mode === 'single') {
    return Promise.resolve({ data: null, error: null })
  }

  return Promise.resolve({ data: [], error: null, count: 0 })
}

function createQueryBuilder(mode: 'many' | 'single' = 'many'): any {
  const builder: Record<string | symbol, unknown> = {}

  const invoke = (nextMode: 'many' | 'single' = mode) => createQueryBuilder(nextMode)

  return new Proxy(builder, {
    get(_target, property) {
      if (property === 'then') {
        return createQueryResponse(mode).then.bind(createQueryResponse(mode))
      }

      if (property === 'single' || property === 'maybeSingle') {
        return () => createQueryResponse('single')
      }

      if (property === 'insert' || property === 'update' || property === 'upsert' || property === 'delete') {
        return () => createQueryResponse(mode)
      }

      if (
        property === 'select' ||
        property === 'eq' ||
        property === 'gte' ||
        property === 'gt' ||
        property === 'lte' ||
        property === 'lt' ||
        property === 'neq' ||
        property === 'in' ||
        property === 'or' ||
        property === 'not' ||
        property === 'order' ||
        property === 'range' ||
        property === 'limit' ||
        property === 'contains' ||
        property === 'match' ||
        property === 'ilike' ||
        property === 'overlaps' ||
        property === 'filter'
      ) {
        return () => invoke(mode)
      }

      return invoke(mode)
    },
  })
}

function createAuthStub() {
  return {
    getUser: async () => ({
      data: { user: null },
      error: null,
    }),
    getSession: async () => ({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: new Error('Supabase environment variables are not configured'),
    }),
    signUp: async () => ({
      data: { user: null, session: null },
      error: new Error('Supabase environment variables are not configured'),
    }),
    signOut: async () => ({
      error: null,
    }),
    exchangeCodeForSession: async () => ({
      data: { session: null, user: null },
      error: null,
    }),
  }
}

export function createNoopSupabaseClient() {
  return {
    auth: createAuthStub(),
    from: () => createQueryBuilder('many'),
  } as any
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}