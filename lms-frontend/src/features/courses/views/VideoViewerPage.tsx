import { Link, useLocation, useParams } from 'react-router';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { toAsyncState } from '@shared/utils/async-state';
import { useCourseSections } from '../hooks/useCourse';
import { buildYoutubeEmbedUrl, parseYoutubeId } from '../utils/youtube';

/** Plays a YouTube video item of a course. Shared by the student and the lecturer routes. */
const VideoViewerPage = () => {
  const { courseId = '', itemId = '' } = useParams();
  const { pathname } = useLocation();
  const state = toAsyncState(useCourseSections(courseId));
  const courseHome = pathname.startsWith('/lecturer')
    ? `/lecturer/classes/${courseId}`
    : `/student/courses/${courseId}`;
  const notFound = (
    <EmptyState
      title="Video not found"
      action={<Link to={courseHome}>Back to course</Link>}
    />
  );

  return (
    <AsyncView state={state} empty={notFound}>
      {(sections) => {
        const item = sections
          .flatMap((section) => section.items)
          .find((x) => x.id === itemId && x.itemType === 'VIDEO');
        const videoId = item?.externalUrl
          ? parseYoutubeId(item.externalUrl)
          : null;
        if (!item || videoId === null) return notFound;
        return (
          <div className="mx-auto max-w-4xl">
            <PageHeader title={item.title} subtitle="YouTube video" />
            <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
              <iframe
                title={item.title}
                src={buildYoutubeEmbedUrl(videoId)}
                className="h-full w-full border-0"
                allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        );
      }}
    </AsyncView>
  );
};

export default VideoViewerPage;