// navigation/index.tsx
import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../context/AuthContext";

/* Auth */
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

/* User screens */
import HomeScreen from "../screens/HomeScreen";
import IncidentReportScreen from "../screens/IncidentReportScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import AnnouncementsScreen from "../screens/AnnouncementsScreen";
import AnnouncementDetailScreen from "../screens/AnnouncementDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import IncidentStatusScreen from "../screens/IncidentStatusScreen";
import SOSHotlinesScreen from "../screens/SOSHotlinesScreen";
import SettingsLanguageScreen from "../screens/SettingsLanguageScreen";

/* NEW: Real-time alerts */
import AlertsScreen from "../screens/AlertsScreen";
import AlertDetailScreen from "../screens/AlertDetailScreen";
import AlertSettingsScreen from "../screens/AlertSettingsScreen";

/* Admin */
import AdminScreen from "../screens/AdminScreen";
import AdminIncidentsScreen from "../screens/AdminIncidentsScreen";
import AdminAnnouncementsScreen from "../screens/AdminAnnouncementsScreen";
import AdminUsersScreen from "../screens/AdminUsersScreen";
import AdminDepartmentScreen from "../screens/AdminDepartmentScreen";
import AdminCategoryIncidentsScreen from "../screens/AdminCategoryIncidentsScreen";
import AdminCreateDepartmentStaff from "../screens/AdminCreateDepartmentStaff";
import AdminBarangaysScreen from "../screens/AdminBarangaysScreen";
import AdminCreateAlertScreen from "../screens/AdminCreateAlertScreen";
import AdminAnnouncementEditScreen from "../screens/AdminAnnouncementEditScreen";
import BookAppointmentScreen from "../screens/BookAppointmentScreen";
import AppointmentSuccessScreen from "../screens/AppointmentSuccessScreen";
import MyAppointmentsScreen from "../screens/MyAppointmentsScreen";
import AdminAppointmentsHubScreen from "../screens/AdminAppointmentsHubScreen";
import AdminAppointmentServiceCreateScreen from "../screens/AdminAppointmentServiceCreateScreen";
import AdminAppointmentSchedulesCreateScreen from "../screens/AdminAppointmentSchedulesCreateScreen";
import AdminWindowsScreen from "../screens/AdminWindowsScreen";
import AdminWindowDetailScreen from "../screens/AdminWindowDetailScreen";
import AdminCheckinScreen from "../screens/AdminCheckinScreen";


export type RootStackParamList = {
  /* Auth */
  Login: undefined;
  Register: undefined;

  /* User */
  Home: undefined;
  IncidentReport: undefined;
  Notifications: undefined;
  Announcements: undefined;
  AnnouncementDetail: { announcementId: string };
  Profile: undefined;

  // Allow opening by incidentId or notificationId
  IncidentStatus: { incidentId?: string; notificationId?: string } | undefined;

  SOSHotlines: undefined;
  SettingsLanguage: undefined;

  /* Real-time alerts */
  Alerts: undefined;
  AlertDetail: { id: string; alert?: any } | undefined;
  AlertSettings: undefined;

  /* Admin */
  Admin: undefined;
  AdminIncidents: undefined;
  AdminUsers: undefined;
  AdminDepartment: undefined;
  AdminCategoryIncidents: undefined;
  AdminCreateDepartmentStaff: undefined;
  AdminBarangays: undefined; 
  AdminCreateAlert: undefined;  // NEW
  AdminAnnouncements: undefined;
  AdminAnnouncementEdit: { id: string | null };

  BookAppointment: undefined; 
  AppointmentSuccess: undefined;  // NEW
  MyAppointments: undefined;

  AdminAppointmentsHub: undefined;
  AdminAppointmentServiceCreate: undefined;
  AdminAppointmentSchedulesCreate: undefined;
   AdminWindows: undefined;
  AdminWindowDetail: {
    window: {
      id: number;
      department_id: number;
      name: string;
      is_open: boolean;
    };
  };
  AdminCheckin: undefined; 
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigation() {
  const { isLoading, userToken, userRole } = useContext(AuthContext);
  if (isLoading) return null;

  // Unauthenticated
  if (!userToken) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  // Admin or Staff
  if (["admin", "staff"].includes(userRole ?? "")) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="AdminIncidents" component={AdminIncidentsScreen} />
        <Stack.Screen name="AdminAnnouncements" component={AdminAnnouncementsScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen name="AdminDepartment" component={AdminDepartmentScreen} />
        <Stack.Screen name="AdminCategoryIncidents" component={AdminCategoryIncidentsScreen} />
        <Stack.Screen name="AdminCreateDepartmentStaff" component={AdminCreateDepartmentStaff} />
        <Stack.Screen name="AdminBarangays" component={AdminBarangaysScreen} />
        <Stack.Screen name="AdminCreateAlert" component={AdminCreateAlertScreen} />
        <Stack.Screen name="AdminAnnouncementEdit" component={AdminAnnouncementEditScreen} />
        <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
        <Stack.Screen name="AdminAppointmentsHub" component={AdminAppointmentsHubScreen} />
        <Stack.Screen name="AdminAppointmentServiceCreate" component={AdminAppointmentServiceCreateScreen} />
        <Stack.Screen name="AdminAppointmentSchedulesCreate" component={AdminAppointmentSchedulesCreateScreen} />
        <Stack.Screen name="AdminWindows" component={AdminWindowsScreen} />
        <Stack.Screen name="AdminWindowDetail" component={AdminWindowDetailScreen} />
        <Stack.Screen name="AdminCheckin" component={AdminCheckinScreen} options={{ headerShown: false }} />

      </Stack.Navigator>
    );
  }

  // Regular authenticated user
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="IncidentStatus" component={IncidentStatusScreen} />
      <Stack.Screen name="SOSHotlines" component={SOSHotlinesScreen} />
      <Stack.Screen name="SettingsLanguage" component={SettingsLanguageScreen} />

      {/* NEW: real-time alerts flow */}
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
      <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />

      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <Stack.Screen name="AppointmentSuccess" component={AppointmentSuccessScreen} />
      <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} />
    </Stack.Navigator>
  );
}
