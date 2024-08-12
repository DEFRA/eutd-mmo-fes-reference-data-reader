export const QuotaStatuses = Object.freeze(
  {
      quota: 'quota',
      nonQuota: 'nonquota'
  }
)

export interface IProduct {
  species: string,
  state: string,
  presentation: string
}