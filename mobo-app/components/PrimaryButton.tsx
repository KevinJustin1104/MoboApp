import * as React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';


type Props = { title: string; onPress?: () => void; disabled?: boolean; style?: ViewStyle };


export default function PrimaryButton({ title, onPress, disabled, style }: Props) {
    return (
        <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.btn, disabled ? styles.disabled : null, style]}>
            <Text style={styles.text}>{title}</Text>
        </TouchableOpacity>
    );
}


const styles = StyleSheet.create({
    btn: { backgroundColor: '#2b6cb0', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    disabled: { opacity: 0.6 },
    text: { color: '#fff', fontWeight: '600' },
}); 