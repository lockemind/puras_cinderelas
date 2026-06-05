import { redirect } from 'next/navigation'

export default async function PlayerRoot({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/play/${token}/team`)
}
