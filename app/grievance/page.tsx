import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Grievance and Contact | NumberCraft',
};

const UL = 'list-disc space-y-1 pl-5';

export default function GrievancePage() {
  return (
    <LegalPage
      title="Grievance and Contact"
      intro={
        <p>
          Questions, complaints, or a request about your data or your
          child&apos;s data? Write to us. A parent or guardian may write for a
          child.
        </p>
      }
      sections={[
        {
          heading: 'Grievance Officer',
          body: (
            <address className="not-italic">
              [GRIEVANCE OFFICER NAME/EMAIL]
              <br />
              [COMPANY LEGAL NAME], [REGISTERED ADDRESS]
              <br />
              Privacy contact: [DPO/contact]
              <br />
              General support: [SUPPORT EMAIL]
            </address>
          ),
        },
        {
          heading: 'What you can ask for',
          body: (
            <ul className={UL}>
              <li>A summary of the personal data we hold about you or your child.</li>
              <li>Correction or update of the data.</li>
              <li>Withdrawal of consent, or deletion of the account and data. You can also delete your account yourself from your profile.</li>
              <li>Removal or renaming of an inappropriate display name or score.</li>
              <li>To nominate someone to act for you if you cannot.</li>
              <li>To report a safety concern or a suspected data breach.</li>
            </ul>
          ),
        },
        {
          heading: 'What happens next',
          body: (
            <ul className={UL}>
              <li>We acknowledge within 24 hours with a reference number.</li>
              <li>We aim to resolve within 15 days. The law allows up to 90 days for data requests; we will tell you if we need longer and why.</li>
              <li>We may need to confirm it is really you or the child&apos;s parent. We will ask for as little as possible and never for government ID by email.</li>
              <li>Urgent child-safety reports are handled the same day.</li>
            </ul>
          ),
        },
        {
          heading: 'If you are not satisfied',
          body: (
            <p>
              Once you have used this process you may complain to the Data
              Protection Board of India. For content complaints you may also use
              the appeal route available under the IT (Intermediary Guidelines
              and Digital Media Ethics Code) Rules, 2021.
            </p>
          ),
        },
        {
          heading: 'Languages',
          body: (
            <p>
              You may write to us, and ask for our Privacy Notice, in English,
              Hindi or any language listed in the Eighth Schedule of the
              Constitution.
            </p>
          ),
        },
      ]}
    />
  );
}
