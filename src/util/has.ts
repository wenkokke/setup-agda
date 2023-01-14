import pick from 'object.pick'

export type Has<T extends object, U extends string | number | symbol> = T & {
  [Property in keyof T & U]: NonNullable<T[Property]>
} & {
  [Property in keyof T]: T[Property]
}

export function has<T extends object, U extends keyof T>(
  object: T,
  keys: readonly U[]
): object is Has<T, U> {
  return Object.values(pick(object, keys)).every(
    (value) => value !== null && value !== undefined
  )
}
