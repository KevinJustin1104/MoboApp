// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const en = {
  common: {
    home: "Home",
    sosHotlines: "SOS & Hotlines",
    reportIncident: "Report Incident",
    notifications: "Notifications",
    announcements: "Announcements",
    profile: "Profile",
    latestUpdates: "Latest Updates",
    noUpdatesTitle: "No updates yet",
    noUpdatesSub: "Once announcements are published, you'll see them here.",
    logout: "Logout",
    report: "Report",
    loading: "Loading…",
    language: "Language",
    settings: "Settings",
    openNotifications: "Open notifications",
    reportIncidentA11y: "Report an incident",
  },
  sos: {
    header: "Emergency Contacts",
    note: "In emergencies, call the appropriate hotline.",
    call: "Call",
    shareLocation: "Share Location",
  },
};

const tl = {
  common: {
    home: "Bahay",
    sosHotlines: "SOS at Hotlines",
    reportIncident: "Mag-report ng Insidente",
    notifications: "Mga Notipikasyon",
    announcements: "Mga Anunsyo",
    profile: "Profile",
    latestUpdates: "Pinakabagong Update",
    noUpdatesTitle: "Wala pang update",
    noUpdatesSub: "Kapag may na-publish na anunsyo, lalabas dito.",
    logout: "Logout",
    report: "I-report",
    loading: "Naglo-load…",
    language: "Wika",
    settings: "Mga Setting",
    openNotifications: "Buksan ang mga notipikasyon",
    reportIncidentA11y: "Mag-report ng insidente",
  },
  sos: {
    header: "Mga Emergency Contact",
    note: "Sa emerhensiya, tumawag sa tamang hotline.",
    call: "Tumawag",
    shareLocation: "Ibahagi Lokasyon",
  },
};

const bcl = {
  common: {
    home: "Harong",
    sosHotlines: "SOS & Hotlines",
    reportIncident: "Mag-report nin Insidente",
    notifications: "Notipikasyon",
    announcements: "Mga Anunsyo",
    profile: "Profile",
    latestUpdates: "Bagong Update",
    noUpdatesTitle: "Wara pang update",
    noUpdatesSub: "Kun may anunsyo na, makikita digdi.",
    logout: "Logout",
    report: "I-report",
    loading: "Nagloload…",
    language: "Lenggwahe",
    settings: "Settings",
    openNotifications: "Buksan an notipikasyon",
    reportIncidentA11y: "Mag-report nin insidente",
  },
  sos: {
    header: "Emergency Contacts",
    note: "Sa emerhensiya, tumawag sa tamang hotline.",
    call: "Tumawag",
    shareLocation: "I-share an Lokasyon",
  },
};

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en }, tl: { translation: tl }, bcl: { translation: bcl } },
  interpolation: { escapeValue: false },
});

export default i18n;
