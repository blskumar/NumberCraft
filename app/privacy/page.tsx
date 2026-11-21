import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy Notice | NumberCraft' };

const UL = 'list-disc space-y-1 pl-5';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      intro={
        <>
          <h2 className="font-semibold">The short version (for kids and parents)</h2>
          <ul className={`${UL} mt-2`}>
            <li>You can play as a guest without telling us anything. Guest progress stays on your device.</li>
            <li>A free account keeps your email, a name you choose, your age group, daily goal and best scores.</li>
            <li>Use a made-up name. Never use your real name, school or town.</li>
            <li>If you are under 18, a parent or guardian must say yes before your scores are saved online or shown on the leaderboard. We use their email only to send that one request.</li>
            <li>Other signed-in players can see your display name, age group and scores. Nobody can see your email.</li>
            <li>No ads, no analytics, no tracking across sites, no selling of data.</li>
            <li>You or your parent can delete the account at any time.</li>
          </ul>
        </>
      }
      sections={[
        {
          heading: '1. Who we are',
          body: (
            <p>
              [COMPANY LEGAL NAME], [REGISTERED ADDRESS]. We decide how your
              data is used, so we are the Data Fiduciary under the Digital
              Personal Data Protection Act, 2023. Privacy contact: [DPO/contact].
            </p>
          ),
        },
        {
          heading: '2. What we collect and why',
          body: (
            <ul className={UL}>
              <li>Email and password (hashed by Google Firebase Authentication): create and secure your account.</li>
              <li>Display name you choose: shown on your profile and the leaderboard.</li>
              <li>Age group and whether you are under 18: right difficulty, leaderboard, and the law on children&apos;s data.</li>
              <li>Daily goal, and scores (game, score, accuracy, date): your goal ring and leaderboards.</li>
              <li>Consent record (version, time, purposes): proof of who agreed.</li>
              <li>Technical logs (IP address, browser, time): security and legal log-keeping.</li>
              <li>On your device only: progress, badges, theme and settings (browser storage).</li>
            </ul>
          ),
        },
        {
          heading: '3. What we do not do',
          body: (
            <p>
              No advertising, no tracking or behavioural monitoring of
              children, no analytics or marketing cookies, no chat, photos or
              uploads, no selling or renting of data.
            </p>
          ),
        },
        {
          heading: '4. Who can see your data',
          body: (
            <ul className={UL}>
              <li>Signed-in players: display name, age group and scores (under-18s only after parental consent).</li>
              <li>Only you: your email and daily goal.</li>
              <li>Our service provider Google (Firebase and Google Cloud), under data-processing terms.</li>
              <li>Authorities, only where the law requires.</li>
            </ul>
          ),
        },
        {
          heading: '5. Children (under 18)',
          body: (
            <ul className={UL}>
              <li>We ask only whether you are under 18, not your birthday.</li>
              <li>We email your parent or guardian a one-time link, valid for 7 days. They confirm they are your parent or lawful guardian and agree.</li>
              <li>Until then your account stays pending: no leaderboard and no online score saving.</li>
              <li>We delete the parent&apos;s email once the link is used or after 7 days.</li>
              <li>A parent can withdraw consent at any time.</li>
            </ul>
          ),
        },
        {
          heading: '6. Your rights',
          body: (
            <>
              <p>
                You (or a parent for a child) can ask for a summary of your
                data, correct it, erase it, withdraw consent, nominate someone
                to act for you, and complain. Withdrawing consent is as easy as
                giving it: use Delete my account in your profile, or contact us.
                We aim to acknowledge within 24 hours and resolve within 15
                days. If you are not satisfied you may complain to the Data
                Protection Board of India.
              </p>
              <p>
                <a className="font-semibold text-[#1D4ED8] underline" href="/grievance">
                  Contact and grievance page
                </a>
              </p>
            </>
          ),
        },
        {
          heading: '7. How long we keep data',
          body: (
            <ul className={UL}>
              <li>Guest data: on your device until you clear it.</li>
              <li>Account, profile, scores: until you delete the account, or after 24 months of inactivity (we email first). Daily score entries: 90 days.</li>
              <li>Parent&apos;s email: until the link is used or 7 days.</li>
              <li>Consent record: while the account exists plus up to 3 years as proof, stored without your name or email.</li>
              <li>Security logs: up to 1 year.</li>
            </ul>
          ),
        },
        {
          heading: '8. Where data is stored',
          body: (
            <p>
              We use Google Firebase and Google Cloud and aim to keep the
              database and server code in Mumbai (asia-south1). Firebase
              Authentication and some Google operations may run outside India.
              Transfers are allowed under the DPDP Act unless the Government
              restricts a country.
            </p>
          ),
        },
        {
          heading: '9. Language and changes',
          body: (
            <p>
              This notice is in English. You may ask for it in Hindi or any
              other language listed in the Eighth Schedule of the Constitution.
              If we change anything important we will tell you in the app and
              ask for fresh consent where required.
            </p>
          ),
        },
      ]}
    />
  );
}
