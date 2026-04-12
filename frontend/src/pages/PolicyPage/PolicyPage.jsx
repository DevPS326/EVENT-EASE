import React from 'react';
import { Link } from 'react-router-dom';

const Section = ({ number, title, children }) => (
  <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8">
    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
      <span className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-600/30 text-violet-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </span>
      {title}
    </h2>
    <div className="text-slate-300 text-sm leading-relaxed space-y-3">{children}</div>
  </section>
);

const PolicyPage = () => (
  <div className="min-h-screen bg-slate-950 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-5 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Events
        </Link>
        <h1 className="text-4xl font-bold text-white mb-3">Refund &amp; Cancellation Policy</h1>
        <p className="text-slate-400 text-sm">
          Last updated: <span className="text-slate-300">April 2025</span>
        </p>
      </div>

      {/* Policy intro */}
      <p className="text-slate-400 mb-8 leading-relaxed">
        At <span className="text-white font-semibold">EventEase</span>, we are committed to a fair
        and transparent ticketing experience. Please read the following policy carefully before
        purchasing tickets.
      </p>

      <div className="space-y-5">

        <Section number="1" title="Ticket Purchase and Refunds">
          <p>All ticket sales are considered final once payment is confirmed. Refunds will only be issued under the following circumstances:</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-400">
            <li>
              <span className="text-slate-200 font-medium">Event Cancellation:</span>{' '}
              If an event is cancelled in its entirety, all ticket holders will receive a full refund to their original payment method.
            </li>
            <li>
              <span className="text-slate-200 font-medium">Significant Event Change:</span>{' '}
              If there is a material change to the event (e.g., date, venue, or headline performer), affected ticket holders may be offered a refund option within 7 days of the announcement.
            </li>
          </ul>
        </Section>

        <Section number="2" title="User-Initiated Cancellations">
          <p>
            Users may request a cancellation for upcoming events <span className="text-white font-medium">up to 48 hours before the event start time</span>. Requests made after this window will not be eligible for a refund.
          </p>
          <p>
            To cancel a ticket, navigate to <span className="text-violet-400">My Tickets</span> on your dashboard, locate the relevant booking, and select the cancellation option. Approved refunds will be processed within <span className="text-white font-medium">5–7 business days</span>.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-amber-300 text-xs">
            Note: A cancellation fee of up to 10% of the ticket price may apply to cover payment gateway charges.
          </div>
        </Section>

        <Section number="3" title="Processing Refunds">
          <p>
            All refunds are credited back to the original payment method used at checkout. Please allow <span className="text-white font-medium">5–10 business days</span> for the amount to appear on your statement, depending on your bank or card issuer.
          </p>
          <p>
            EventEase is not responsible for delays caused by your bank or payment processor once the refund has been initiated on our end.
          </p>
        </Section>

        <Section number="4" title="Organizer Responsibilities">
          <p>
            Event organizers on EventEase agree to notify attendees promptly of any cancellation or significant change, and to cooperate fully with our refund process. Organizers who repeatedly cancel events may have their accounts reviewed or suspended.
          </p>
        </Section>

        <Section number="5" title="Contact Us">
          <p>
            For any questions or disputes regarding this policy, please contact our support team:
          </p>
          <a
            href="mailto:support@eventease.com"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors mt-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@eventease.com
          </a>
        </Section>

      </div>
    </div>
  </div>
);

export default PolicyPage;
