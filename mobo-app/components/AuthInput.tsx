import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';


type Props = TextInputProps & { label?: string };


export default function AuthInput({ label, ...rest }: Props) {
    return (
        <View style={styles.wrapper}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput style={styles.input} placeholder={label} placeholderTextColor="#999" {...rest} />
        </View>
    );
}


const styles = StyleSheet.create({
    wrapper: { marginBottom: 12 },
    label: { fontSize: 12, color: '#333', marginBottom: 6 },
    input: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e6e6e6' },
});