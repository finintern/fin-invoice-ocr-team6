#!/usr/bin/env python3
"""
Main Penetration Testing Script for OCR Group 6 API

This script runs all penetration tests:
1. Authentication Penetration Testing
2. Invoice Penetration Testing 
3. Purchase Order Penetration Testing

Usage:
  python3 run_all_tests.py [-u <base_url>] [-v]
"""

import argparse
import time
from colorama import Fore, Style, init
from auth_pentest import AuthenticationPenTester
from invoice_pentest import InvoicePenTester
from purchase_order_pentest import PurchaseOrderPenTester

# Initialize colorama for cross-platform colored terminal output
init()

def main():
    parser = argparse.ArgumentParser(description="OCR Group 6 API Full Penetration Testing Suite")
    parser.add_argument("-u", "--url", help="Base URL of the API (default: http://localhost:3000)", default="http://localhost:3000")
    parser.add_argument("-v", "--verbose", help="Enable verbose output", action="store_true")
    
    args = parser.parse_args()
    
    print(f"{Fore.CYAN}🔒 OCR GROUP 6 API FULL PENETRATION TESTING SUITE 🔒{Style.RESET_ALL}")
    print("=" * 70)
    print(f"{Fore.YELLOW}Target URL: {args.url}{Style.RESET_ALL}")
    print("=" * 70)
    
    start_time = time.time()
    
    print(f"\n{Fore.MAGENTA}Running Authentication Tests...{Style.RESET_ALL}")
    auth_tester = AuthenticationPenTester(args.url)
    auth_tester.run_tests()
    
    print(f"\n{Fore.MAGENTA}Running Invoice Tests...{Style.RESET_ALL}")
    invoice_tester = InvoicePenTester(args.url)
    invoice_tester.run_tests()
    
    print(f"\n{Fore.MAGENTA}Running Purchase Order Tests...{Style.RESET_ALL}")
    po_tester = PurchaseOrderPenTester(args.url)
    po_tester.run_tests()
    
    total_duration = time.time() - start_time
    
    print("\n" + "=" * 70)
    print(f"{Fore.CYAN}📊 OVERALL PENETRATION TEST RESULTS 📊{Style.RESET_ALL}")
    print("=" * 70)
    print(f"Total Duration: {total_duration:.2f} seconds")
    print(f"Tests Run: {auth_tester.test_count + invoice_tester.test_count + po_tester.test_count}")
    print(f"Passed: {auth_tester.success_count + invoice_tester.success_count + po_tester.success_count}")
    print(f"Failed: {auth_tester.failure_count + invoice_tester.failure_count + po_tester.failure_count}")
    
    total_vulnerabilities = len(auth_tester.vulnerabilities_found) + len(invoice_tester.vulnerabilities_found) + len(po_tester.vulnerabilities_found)
    
    if total_vulnerabilities == 0:
        print(f"\n{Fore.GREEN}No vulnerabilities found! The API appears to be secure.{Style.RESET_ALL}")
    else:
        print(f"\n{Fore.RED}Total Vulnerabilities Found: {total_vulnerabilities}{Style.RESET_ALL}")
    
    print("\n" + "=" * 70)
    print(f"{Fore.YELLOW}DISCLAIMER: This penetration test was performed in a controlled environment")
    print(f"with proper authorization. Never test applications without permission.{Style.RESET_ALL}")
    print("=" * 70)

if __name__ == "__main__":
    main()
