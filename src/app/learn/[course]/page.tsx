import { LearningPlayer } from '@/components/education/LearningPlayer';

export default async function CourseLearningPage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course } = await params;
  return <LearningPlayer courseSlug={course} />;
}
