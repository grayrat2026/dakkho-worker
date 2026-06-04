import AdminClientPage from '@/components/admin/admin-client-page';

export function generateStaticParams() {
  return [
    { slug: [] },
    { slug: ['dashboard'] },
    { slug: ['users'] },
    { slug: ['courses'] },
    { slug: ['videos'] },
    { slug: ['instructors'] },
    { slug: ['categories'] },
    { slug: ['institutes'] },
    { slug: ['notifications'] },
    { slug: ['config'] },
    { slug: ['email'] },
    { slug: ['analytics'] },
    { slug: ['settings'] },
  ];
}

export default function Page({ params }: { params: { slug?: string[] } }) {
  const currentPage = params.slug?.[0] || 'dashboard';
  return <AdminClientPage currentPage={currentPage} />;
}
