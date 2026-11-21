import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Terms of Use | NumberCraft' };

const UL = 'list-disc space-y-1 pl-5';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={
        <p>
          NumberCraft is a free maths and probability game for learners about
          8 to 16, run by [COMPANY LEGAL NAME], [REGISTERED ADDRESS]. If you
          are under 18, please read these with a parent or guardian.
        </p>
      }
      sections={[
        {
          heading: '1. What NumberCraft is',
          body: (
            <p>
              A practice game. It is not a school, coaching centre or exam
              body and we do not promise marks or results.
            </p>
          ),
        },
        {
          heading: '2. Accounts and age',
          body: (
            <p>
              Guests can try limited levels. A free account lets you save
              scores online and join leaderboards. People under 18 need a
              parent or guardian to agree first (see the{' '}
              <a className="font-semibold text-[#1D4ED8] underline" href="/privacy">
                Privacy Notice
              </a>
              ). Give honest answers and keep your password private.
            </p>
          ),
        },
        {
          heading: '3. Display names and conduct',
          body: (
            <>
              <p>Your display name is shown to other players. Do not use a name that:</p>
              <ul className={UL}>
                <li>is your real full name, school, address or contact details;</li>
                <li>is rude, hateful, sexual, violent or bullying;</li>
                <li>pretends to be someone else, or contains a link or advert;</li>
                <li>is unlawful or breaks anyone&apos;s rights.</li>
              </ul>
              <p>
                Do not cheat or attack the service. We may rename names, remove
                scores or suspend accounts that break these rules. Report a
                problem on the{' '}
                <a className="font-semibold text-[#1D4ED8] underline" href="/grievance">
                  contact page
                </a>
                .
              </p>
            </>
          ),
        },
        {
          heading: '4. Our content and yours',
          body: (
            <p>
              The game, puzzles and design belong to NumberCraft or its
              licensors; use them for personal, non-commercial play. You give
              us permission to show your display name with your scores while
              your account exists.
            </p>
          ),
        },
        {
          heading: '5. Changes and availability',
          body: (
            <p>
              We may change or stop features, including leaderboards. The
              service is provided as is. To the extent the law allows we are
              not liable for indirect loss; nothing limits liability that the
              law does not allow us to limit.
            </p>
          ),
        },
        {
          heading: '6. Ending your account',
          body: (
            <p>
              You can delete your account at any time from your profile. We may
              suspend accounts that break these terms.
            </p>
          ),
        },
        {
          heading: '7. Complaints and law',
          body: (
            <p>
              Contact the Grievance Officer on the contact page; we acknowledge
              within 24 hours and aim to resolve within 15 days. Indian law
              applies; courts at [GOVERNING-LAW CITY] have jurisdiction, subject
              to any mandatory consumer rights.
            </p>
          ),
        },
      ]}
    />
  );
}
