import { Outlet } from "react-router-dom"
import React from 'react'
import Header from './Header'
import Footer from './Footer'

function Layout(props) {
    return (
        <>
            <main>
                <Outlet />
            </main>
        </>
    )
}

export default Layout