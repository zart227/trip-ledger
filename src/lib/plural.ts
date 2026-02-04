/**
 * Russian pluralization: 1 рейс, 2 рейса, 5 рейсов
 * @param n - number
 * @param forms - [singular, few, many] e.g. ['рейс', 'рейса', 'рейсов']
 */
export function pluralize(n: number, forms: [string, string, string]): string {
  const cases = [2, 0, 1, 1, 1, 2] as const
  const index =
    n % 100 > 4 && n % 100 < 20 ? 2 : cases[Math.min(n % 10, 5)]
  return forms[index]
}
