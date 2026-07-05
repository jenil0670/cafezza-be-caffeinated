import SwiftUI

struct ContentView: View {
    var body: some View {
        if let fileURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "assets") {
            WebView(url: fileURL)
                .ignoresSafeArea()
                .background(Color(red: 0.035, green: 0.027, blue: 0.027)) // Matches --bg-color #090707
        } else {
            VStack {
                Text("Error: Web assets not found.")
                    .foregroundColor(.white)
                    .font(.headline)
                Text("Please run copy_assets_to_native.ps1 first.")
                    .foregroundColor(.gray)
                    .font(.subheadline)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 0.035, green: 0.027, blue: 0.027))
        }
    }
}
