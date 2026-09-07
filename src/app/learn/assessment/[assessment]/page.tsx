import { AssessmentPlayer } from '@/components/education/AssessmentPlayer';

export default async function EducationAssessmentPage({
  params,
}: {
  params: Promise<{ assessment: string }>;
}) {
  const { assessment } = await params;
  return <AssessmentPlayer assessmentId={assessment} />;
}
