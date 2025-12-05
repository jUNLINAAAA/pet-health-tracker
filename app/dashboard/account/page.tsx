"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  Download,
  Facebook,
  FileText,
  Instagram,
  LogOut,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  User as UserIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Separator } from "@/components/ui/separator";
import { Surface } from "@/components/ui/Surface";
import { Switch } from "@/components/ui/switch";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { StorageService } from "@/lib/services";

type ProfileFormState = {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
};

type NotificationPreferences = {
  healthReminders: boolean;
  appointmentReminders: boolean;
  marketingEmails: boolean;
  appPushNotifications: boolean;
};

const defaultNotifications: NotificationPreferences = {
  healthReminders: true,
  appointmentReminders: true,
  marketingEmails: false,
  appPushNotifications: true,
};

const defaultAvatarUrl =
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [profileData, setProfileData] = useState<ProfileFormState>({
    fullName: "",
    username: "",
    email: "",
    phoneNumber: "",
  });
  const [notifications, setNotifications] = useState<NotificationPreferences>(defaultNotifications);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const refreshProfileData = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !user) return;

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error refreshing profile:", profileError);
        return;
      }

      const metadata = user.user_metadata || {};
      const profileSource = profile || {};

      setProfileData({
        fullName: profileSource.full_name || metadata.full_name || metadata.name || "",
        username: profileSource.username || metadata.username || "",
        email: user.email || "",
        phoneNumber: profileSource.phone_number || metadata.phone_number || metadata.phone || "",
      });
      setAvatarUrl(profileSource.avatar_url || metadata.avatar_url || defaultAvatarUrl);
      setNotifications(profileSource.notifications || metadata.notifications || defaultNotifications);
      setConnectedAccounts(profileSource.connected_accounts || metadata.connected_accounts || []);
    } catch (err) {
      console.error("Error refreshing profile data:", err);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          toast.error("Authentication service unavailable");
          setLoading(false);
          return;
        }

        const { data: { user: currentUser }, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error || !currentUser) {
          router.push("/auth/login");
          return;
        }

        setUser(currentUser);

        // Fetch profile from user_profiles table
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error fetching profile:", profileError);
        }

        // Use profile data if exists, fallback to auth metadata
        const metadata = currentUser.user_metadata || {};

        if (profile) {
          setProfileData({
            fullName: profile.full_name || metadata.full_name || metadata.name || "",
            username: profile.username || metadata.username || "",
            email: currentUser.email || "",
            phoneNumber: profile.phone_number || metadata.phone_number || metadata.phone || "",
          });
          setAvatarUrl(profile.avatar_url || metadata.avatar_url || defaultAvatarUrl);
          setNotifications(profile.notifications || metadata.notifications || defaultNotifications);
          setConnectedAccounts(profile.connected_accounts || metadata.connected_accounts || []);
        } else {
          // Fallback to auth metadata for users without profile
          setProfileData({
            fullName: metadata.full_name || metadata.name || "",
            username: metadata.username || "",
            email: currentUser.email || "",
            phoneNumber: metadata.phone_number || metadata.phone || "",
          });
          setAvatarUrl(metadata.avatar_url || defaultAvatarUrl);
          setNotifications(metadata.notifications || defaultNotifications);
          setConnectedAccounts(metadata.connected_accounts || []);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load account data");
        setLoading(false);
      }
    };

    fetchUserData();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleProfileChange = (field: keyof ProfileFormState, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await StorageService.uploadUserAvatar(file);
      setAvatarUrl(result.url);

      const supabase = getSupabaseBrowserClient();
      if (supabase && user) {
        // Save to user_profiles table
        await supabase
          .from("user_profiles")
          .upsert({
            id: user.id,
            avatar_url: result.url,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "id",
          });

        // Also update auth metadata as backup
        await supabase.auth.updateUser({
          data: { avatar_url: result.url }
        });
      }

      toast.success('Avatar uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleNotificationChange = async (key: keyof NotificationPreferences, checked: boolean) => {
    const newNotifications = { ...notifications, [key]: checked };
    setNotifications(newNotifications);

    // Save immediately
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      await supabase.auth.updateUser({
        data: { notifications: newNotifications }
      });
    } catch (error) {
      console.error("Error saving notification preference:", error);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !user) {
        toast.error("Authentication service unavailable");
        return;
      }

      // Save to user_profiles table using upsert
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          full_name: profileData.fullName,
          username: profileData.username,
          phone_number: profileData.phoneNumber,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id",
        });

      if (profileError) {
        throw profileError;
      }

      // Also update auth metadata as backup
      await supabase.auth.updateUser({
        data: {
          full_name: profileData.fullName,
          username: profileData.username,
          phone_number: profileData.phoneNumber,
          avatar_url: avatarUrl,
        }
      });

      await refreshProfileData();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !user) {
        toast.error("Authentication service unavailable");
        return;
      }

      // Save to user_profiles table
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          notifications,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id",
        });

      if (profileError) {
        throw profileError;
      }

      // Also update auth metadata as backup
      await supabase.auth.updateUser({
        data: { notifications }
      });

      await refreshProfileData();
      toast.success("Notification preferences saved");
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      toast.error(error.message || "Failed to update preferences");
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleConnectAccount = async (provider: string) => {
    const newConnected = [...connectedAccounts, provider];
    setConnectedAccounts(newConnected);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !user) return;

      // Save to user_profiles table
      await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          connected_accounts: newConnected,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id",
        });

      // Also update auth metadata as backup
      await supabase.auth.updateUser({
        data: { connected_accounts: newConnected }
      });
      await refreshProfileData();
      toast.success(`Connected ${provider} successfully`);
    } catch (error) {
      console.error("Error connecting account:", error);
    }
  };

  const handleDisconnectAccount = async (provider: string) => {
    const newConnected = connectedAccounts.filter((account) => account !== provider);
    setConnectedAccounts(newConnected);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase || !user) return;

      // Save to user_profiles table
      await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          connected_accounts: newConnected,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "id",
        });

      // Also update auth metadata as backup
      await supabase.auth.updateUser({
        data: { connected_accounts: newConnected }
      });
      await refreshProfileData();
      toast.success(`Disconnected ${provider}`);
    } catch (error) {
      console.error("Error disconnecting account:", error);
    }
  };

  const handleExportData = () => {
    toast.info("Data export functionality coming soon");
  };

  const handleDeleteAccount = () => {
    toast.info("Please contact support to delete your account");
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        router.push("/auth/login");
        return;
      }

      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-base">Loading your account...</p>
      </div>
    );
  }

  const socialIntegrations = [
    {
      id: "instagram",
      label: "Instagram",
      description: "Pull shared reels or stories into pet journals.",
      icon: <Instagram className="h-5 w-5" />,
    },
    {
      id: "facebook",
      label: "Facebook",
      description: "Sync Messenger notes for caregiver handoffs.",
      icon: <Facebook className="h-5 w-5" />,
    },
    {
      id: "tiktok",
      label: "TikTok",
      description: "Queue short clips for behavior specialists.",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692a6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
        </svg>
      ),
    },
    {
      id: "x",
      label: "X",
      description: "Monitor public updates that may relate to alerts.",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100/80 py-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-16">
        <SectionHeader
          eyebrow="Account"
          title="Account Settings"
          description="Manage your profile, notifications, and connected services."
          action={
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full sm:w-auto text-sm sm:text-base text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          }
        />

        <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[2fr,1fr]">
          <Surface className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-xl sm:rounded-2xl bg-indigo-50 p-2 sm:p-3 text-indigo-600 flex-shrink-0">
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-900">Profile & identity</p>
                <p className="text-xs sm:text-sm text-slate-500">Your personal information and settings.</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative group">
                  <Avatar className="h-20 w-20 ring-4 ring-white">
                    <AvatarImage src={avatarUrl} alt={profileData.fullName} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : "P"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Profile Photo</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click on the avatar to upload a new photo
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="mt-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(event) => handleProfileChange("fullName", event.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(event) => handleProfileChange("username", event.target.value)}
                    placeholder="@username"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profileData.email} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500">Email cannot be changed here.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileData.phoneNumber}
                    onChange={(event) => handleProfileChange("phoneNumber", event.target.value)}
                    placeholder="+1 (555) 987-1234"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  {savingProfile ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </div>
          </Surface>

          <Surface variant="panel" className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6">
            <div>
              <p className="text-sm sm:text-base font-semibold text-slate-900">Connected services</p>
              <p className="text-xs sm:text-sm text-slate-500">
                Link social accounts for enhanced features.
              </p>
            </div>

            <div className="space-y-4">
              {socialIntegrations.map((provider) => {
                const connected = connectedAccounts.includes(provider.id);
                return (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-white/60 bg-white/70 px-3 sm:px-4 py-2 sm:py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`rounded-xl sm:rounded-2xl p-2 sm:p-3 flex-shrink-0 ${connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                      >
                        {provider.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">{provider.label}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-2">{provider.description}</p>
                      </div>
                    </div>
                    <Button
                      variant={connected ? "outline" : "secondary"}
                      size="sm"
                      onClick={() =>
                        connected ? handleDisconnectAccount(provider.id) : handleConnectAccount(provider.id)
                      }
                      className="text-xs sm:text-sm ml-2 flex-shrink-0"
                    >
                      {connected ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <p className="font-semibold text-slate-900">Data controls</p>
                <p className="text-sm text-slate-500">Manage your data and account.</p>
              </div>
              <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExportData}>
                <Download className="h-4 w-4" />
                Export profile & records
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-2 text-red-600 hover:text-red-600" onClick={handleDeleteAccount}>
                <Trash2 className="h-4 w-4" />
                Delete account
              </Button>
            </div>
          </Surface>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2">
          <Surface className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-xl sm:rounded-2xl bg-amber-50 p-2 sm:p-3 text-amber-600 flex-shrink-0">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-900">Notification preferences</p>
                <p className="text-xs sm:text-sm text-slate-500">Control how and when we notify you.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100/70 bg-white/80 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Health alerts</p>
                  <p className="text-sm text-slate-500">Get notified about abnormal health metrics.</p>
                </div>
                <Switch
                  checked={notifications.healthReminders}
                  onCheckedChange={(checked) => handleNotificationChange("healthReminders", checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100/70 bg-white/80 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Appointment reminders</p>
                  <p className="text-sm text-slate-500">Reminders for upcoming vet visits.</p>
                </div>
                <Switch
                  checked={notifications.appointmentReminders}
                  onCheckedChange={(checked) => handleNotificationChange("appointmentReminders", checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100/70 bg-white/80 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Product updates</p>
                  <p className="text-sm text-slate-500">News about new features and improvements.</p>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onCheckedChange={(checked) => handleNotificationChange("marketingEmails", checked)}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100/70 bg-white/80 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">Push notifications</p>
                  <p className="text-sm text-slate-500">Real-time notifications in the app.</p>
                </div>
                <Switch
                  checked={notifications.appPushNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("appPushNotifications", checked)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={handleSaveNotifications} disabled={savingNotifications}>
                {savingNotifications ? "Saving..." : "Save preferences"}
              </Button>
            </div>
          </Surface>

          <Surface className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-xl sm:rounded-2xl bg-emerald-50 p-2 sm:p-3 text-emerald-600 flex-shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-900">Security & access</p>
                <p className="text-xs sm:text-sm text-slate-500">Manage your account security settings.</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="rounded-2xl border border-slate-100/70 bg-white/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Two-factor authentication</p>
                    <p className="text-sm text-slate-500">Add extra security to your account.</p>
                  </div>
                </div>
                <Button className="mt-4" variant="outline" disabled>
                  Coming soon
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-100/70 bg-white/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Session history</p>
                    <p className="text-sm text-slate-500">View and manage active sessions.</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  {user && (
                    <div className="space-y-1">
                      <p><strong>Account ID:</strong> {user.id.slice(0, 8)}...</p>
                      <p><strong>Created:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Last sign in:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
