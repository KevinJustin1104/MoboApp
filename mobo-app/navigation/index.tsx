// navigation/index.tsx
import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import { AuthContext } from "../context/AuthContext";
import IncidentReportScreen from "../screens/IncidentReportScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import AnnouncementsScreen from "../screens/AnnouncementsScreen";
import AnnouncementDetailScreen from "../screens/AnnouncementDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import IncidentStatusScreen from "../screens/IncidentStatusScreen";
import AdminScreen from "../screens/AdminScreen";
import AdminIncidentsScreen from "../screens/AdminIncidentsScreen";
import AdminAnnouncementsScreen from "../screens/AdminAnnouncementsScreen";
import AdminUsersScreen from "../screens/AdminUsersScreen";
import AdminDepartmentScreen from "../screens/AdminDepartmentScreen";
import AdminCategoryIncidentsScreen from "../screens/AdminCategoryIncidentsScreen";
import AdminIncidentDetailScreen from "../screens/AdminIncidentDetailScreen";
import AdminCreateDepartmentStaff from "../screens/AdminCreateDepartmentStaff";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  IncidentReport: undefined;
  Notifications: undefined;
  Announcements: undefined;
  AnnouncementDetail: { announcementId: string };
  Admin: undefined;
  Profile: undefined;
  AdminIncidents: undefined;
  AdminAnnouncements: undefined;
  AdminUsers: undefined;
  AdminDepartment: undefined;
  AdminCategoryIncidents: undefined;
  AdminCreateDepartmentStaff: undefined;
  IncidentStatus: { notificationId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigation() {
  const { isLoading, userToken, userRole } = useContext(AuthContext);
  console.log('userRole: ', userRole)
  if (isLoading) return null;

  // unauthenticated
  if (!userToken) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  // admin or staff
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
      </Stack.Navigator>
    );
  }

  // regular authenticated user
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="IncidentStatus" component={IncidentStatusScreen} />
    </Stack.Navigator>
  );
}
