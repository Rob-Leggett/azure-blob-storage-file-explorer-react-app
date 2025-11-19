'use client'

import { useSession, signOut } from 'next-auth/react'
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Separator } from '@/components/common/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/common/ui/tabs'
import { Switch } from '@/components/common/ui/switch'
import { ShieldCheck, Bell, KeyRound, User2, Trash2 } from 'lucide-react'
import { SIGN_IN_AUTHENTICATED } from '@/lib/constants'
import { extractGroups, extractRoles, extractScopes } from '@/lib/utils/common/auth/auth-helper'
import { AccessList } from '@/components/common/admin/settings/access-list'
import { useState } from 'react'

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const [notifyBuilds, setNotifyBuilds] = useState(false)
  const [notifyFailures, setNotifyFailures] = useState(false)

  const isAuthed = status === SIGN_IN_AUTHENTICATED

  return (
    <div className="flex flex-col gap-6 bg-white">
      {/* Thick red bar at top */}
      <div className="h-2 w-full bg-red-600 rounded-md" />

      <div className="flex-1 p-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your profile, security and notifications.</p>
            </div>
          </div>

          {isAuthed && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="profile" className="gap-2">
                  <User2 className="size-4" /> Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <ShieldCheck className="size-4" /> Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="size-4" /> Notifications
                </TabsTrigger>
                <TabsTrigger value="api" className="gap-2">
                  <KeyRound className="size-4" /> API Access
                </TabsTrigger>
                <TabsTrigger value="danger" className="gap-2">
                  <Trash2 className="size-4" /> Danger Zone
                </TabsTrigger>
              </TabsList>

              {/* Profile */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>These details are visible in the portal.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Display name */}
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Display name</div>
                        <div className="text-base">{session?.user?.name || '—'}</div>
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Email</div>
                        <div className="text-base">{session?.user?.email || '—'}</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">Sign out of this device</div>
                        <div className="text-muted-foreground">You can sign back in any time.</div>
                      </div>
                      <Button variant="outline" onClick={() => signOut({ callbackUrl: '/auth/login' })}>
                        Sign out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>...</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">TBA</div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Choose what you’d like to hear about.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">Build status</div>
                        <div className="text-muted-foreground">Receive notifications when builds complete.</div>
                      </div>
                      <Switch checked={notifyBuilds} onCheckedChange={setNotifyBuilds} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">Failures & alerts</div>
                        <div className="text-muted-foreground">Be alerted when tests or jobs fail.</div>
                      </div>
                      <Switch checked={notifyFailures} onCheckedChange={setNotifyFailures} />
                    </div>

                    <div className="flex justify-end">
                      <Button className="bg-red-600 hover:bg-red-700">Save preferences</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Access (read-only): show groups & roles from the token/session */}
              <TabsContent value="api">
                <Card>
                  <CardHeader>
                    <CardTitle>Access & permissions</CardTitle>
                    <CardDescription>These come from your Microsoft Entra ID token.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Application roles (Entra app roles -> "roles" claim) */}
                    <section className="space-y-3">
                      <div className="text-sm font-medium">Application roles</div>
                      <div className="text-sm text-muted-foreground">
                        App-specific roles assigned to you (from the <code>roles</code> claim).
                      </div>
                      <AccessList items={extractRoles(session)} emptyLabel="No application roles found" />
                    </section>

                    <Separator />

                    {/* Directory groups (Entra security groups -> "groups" claim) */}
                    <section className="space-y-3">
                      <div className="text-sm font-medium">Directory groups</div>
                      <div className="text-sm text-muted-foreground">
                        Security/Office groups from the <code>groups</code> claim. May appear as names or GUIDs.
                      </div>
                      <AccessList items={extractGroups(session)} emptyLabel="No directory groups found" />
                    </section>

                    <Separator />

                    {/* Scopes (scp) */}
                    <section className="space-y-3">
                      <div className="text-sm font-medium">Scopes</div>
                      <div className="text-sm text-muted-foreground">
                        Delegated permissions granted to this access token (from the <code>scp</code> claim).
                      </div>
                      <AccessList items={extractScopes(session)} emptyLabel="No scopes found on the token" />
                    </section>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Danger Zone */}
              <TabsContent value="danger">
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700">Danger Zone</CardTitle>
                    <CardDescription>Be careful—these actions can’t be undone.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-medium">Revoke all sessions</div>
                        <div className="text-muted-foreground">Sign out all devices linked to your account.</div>
                      </div>
                      <Button variant="destructive">Revoke sessions</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
