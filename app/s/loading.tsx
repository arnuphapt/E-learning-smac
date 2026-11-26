import { PageContainer } from "@/components/common/page-container"
import { LoadingState } from "@/components/common/states"

export default function StudentLoading() {
  return (
    <PageContainer>
      <LoadingState className="min-h-[50vh]" />
    </PageContainer>
  )
}
