import PortalProyectoDetailClient from './PortalProyectoDetailClient'

export default function PortalProyectoDetailPage({ params }: { params: { id: string } }) {
  return <PortalProyectoDetailClient proyectoId={parseInt(params.id)} />
}
