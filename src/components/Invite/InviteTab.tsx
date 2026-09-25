import React, { useState } from 'react';
import { useGFlix } from '../../context/GFlixContext';
import {
  Users,
  Copy,
  Check,
  Gift,
  Award,
  Share2,
  TrendingUp,
  UserPlus,
  Coins,
  QrCode,
  Sparkles,
} from 'lucide-react';

export const InviteTab: React.FC = () => {
  const { wallet, referrals, showToast } = useGFlix();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(wallet.referralCode);
    setCopiedCode(true);
    showToast(`Referral code ${wallet.referralCode} copied!`, 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(wallet.referralLink);
    setCopiedLink(true);
    showToast('Referral invitation link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8">
      {/* Invite Hero Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950/80 border border-indigo-800/40 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sun Belt Inc Referral Partner Program</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Invite Friends & Earn Up To{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent">
                10% Commission
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Share your personal referral link with friends. Earn continuous cash commissions whenever your team members lease GLK or CBN servers!
            </p>
          </div>

          <div className="bg-slate-950/80 border border-indigo-800/50 rounded-2xl p-4 text-center min-w-[200px] w-full md:w-auto">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Referral Earnings</div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">
              ₱{wallet.referralEarningsPhp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-cyan-400 mt-1 font-semibold">
              Directly Cashable to Wallet
            </div>
          </div>
        </div>
      </div>

      {/* Referral Code & Link Share Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-lg">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Share2 className="w-4 h-4 text-cyan-400" /> Your Personal Referral Credentials
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Referral Code Box */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
            <div className="text-xs text-slate-400 font-medium">Your Referral Code</div>
            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
              <span className="font-mono text-lg font-bold text-cyan-300 tracking-wider">
                {wallet.referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Referral Link Box */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
            <div className="text-xs text-slate-400 font-medium">Your Invitation Link</div>
            <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
              <span className="font-mono text-xs text-slate-300 truncate">
                {wallet.referralLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Send this link on Facebook, Messenger, Telegram, or Viber.
          </p>
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            <QrCode className="w-4 h-4" /> View QR Code
          </button>
        </div>
      </div>

      {/* Commission Structure & Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tier 1 Direct */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 rounded-full">
              Tier 1 Direct
            </span>
            <span className="text-2xl font-black font-mono text-cyan-400">10%</span>
          </div>
          <h4 className="font-bold text-white text-sm">Direct Referral Reward</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Earn 10% instant commission whenever your direct invite purchases or leases any server package.
          </p>
        </div>

        {/* Tier 2 Secondary */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-950 border border-indigo-800 px-2.5 py-0.5 rounded-full">
              Tier 2 Secondary
            </span>
            <span className="text-2xl font-black font-mono text-indigo-400">3%</span>
          </div>
          <h4 className="font-bold text-white text-sm">Sub-Team Commission</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Earn 3% commission on server leases made by users invited by your direct referrals.
          </p>
        </div>

        {/* Tier 3 Team */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
              Tier 3 Team
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400">1%</span>
          </div>
          <h4 className="font-bold text-white text-sm">Level 3 Team Bonus</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Earn 1% additional commission across extended level 3 server lease activities.
          </p>
        </div>
      </div>

      {/* Referral Team List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Invited Team Members ({referrals.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Track your invited partners and total earnings generated.
            </p>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300">
            {wallet.directReferralsCount} Direct • {wallet.teamCount} Team Total
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {referrals.map((member) => (
            <div key={member.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-sm">
                  {member.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    <span>{member.name}</span>
                    <span className="text-[10px] font-semibold text-slate-400 font-mono">
                      ({member.phoneMasked})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded text-[10px]">
                      Tier {member.tier}
                    </span>
                    <span>Joined {member.joinDate}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-emerald-400 font-mono">
                  +₱{member.commissionEarnedPhp.toLocaleString('en-US')}
                </div>
                <div className="text-[10px] text-slate-400">
                  {member.activeServers} Active Servers Leased
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-lg font-bold text-white">Your Referral QR Code</h3>
            <p className="text-xs text-slate-400">Scan to join Sun Belt Inc server leasing under your team.</p>

            <div className="bg-white p-4 rounded-2xl max-w-[200px] mx-auto shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  wallet.referralLink
                )}`}
                alt="Referral QR Code"
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <p className="text-xs font-mono text-cyan-300 font-bold bg-slate-950 p-2 rounded-xl border border-slate-800">
              {wallet.referralCode}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
